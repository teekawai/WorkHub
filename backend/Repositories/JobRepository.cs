using backend.Common;
using backend.Constants;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class JobRepository : IJobRepository
    {
        private readonly WorkHubContext _context;

        public JobRepository(WorkHubContext context)
        {
            _context = context;
        }

        public Task<Job?> GetByIdAsync(string jobId)
        {
            return _context.Jobs.Include(j => j.Employer).FirstOrDefaultAsync(j => j.JobId == jobId);
        }

        // lấy job để xem danh sách của công ty đó
        public Task<(List<Job> Items, int TotalItems)> GetByEmployerAsync(string employerId, int page, int limit)
        {
            return ReadWithEmployer().Where(j => j.EmployerId == employerId).OrderByDescending(j => j.CreatedAt).ToPageAsync(page, limit);
        }

        public Task<(List<Job> Items, int TotalItems)> SearchAsync(Func<IQueryable<Job>, IQueryable<Job>> buildQuery, int page, int limit)
        {
            return buildQuery(ReadWithEmployer()).ToPageAsync(page, limit);
        }

        private IQueryable<Job> ReadWithEmployer() => _context.Jobs.AsNoTracking().Include(j => j.Employer);

        // MySQL tự chọn 1 giao dịch làm nạn nhân khi deadlock và đã rollback nó: ghi lại 1 lần là hết kẹt (Business 2.4.1: ghi đồng thời chỉ ra 200/409/404, không 500).
        // Deadlock lần 2 để global handler xử lý (500). Tracker còn nguyên trạng thái Modified/Deleted sau lần lỗi nên SaveChanges lại vẫn kèm WHERE status=<cũ>.
        private async Task SaveRetryOnDeadlockAsync()
        {
            try { await _context.SaveChangesAsync(); }
            catch (Exception ex) when (DbErrors.IsDeadlock(ex)) { await _context.SaveChangesAsync(); }
        }

        public async Task<bool> AddIfEmployerVerifiedAsync(Job job)
        {
            try { return await AddIfEmployerVerifiedOnceAsync(job); }
            catch (Exception ex) when (DbErrors.IsDeadlock(ex))
            {
                _context.Entry(job).State = EntityState.Detached; // tx đã rollback, làm lại từ đầu
                return await AddIfEmployerVerifiedOnceAsync(job);
            }
        }

        private async Task<bool> AddIfEmployerVerifiedOnceAsync(Job job)
        {
            // InMemory (unit test) không có transaction / raw SQL: nhánh này chỉ phục vụ test, race với unverify kiểm bằng API test
            if (!_context.Database.IsRelational())
            {
                if (!await _context.Employerprofiles.AnyAsync(e => e.UserId == job.EmployerId && e.IsVerified)) return false;
                _context.Jobs.Add(job);
                await _context.SaveChangesAsync();
                return true;
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            // FOR SHARE: unverify giữ khóa ghi trên dòng employerprofile nên lệnh đọc này chờ tới khi unverify xong, chặn Job Open lọt lưới (Business 3.4.1).
            // Dùng ToListAsync, không SingleOrDefaultAsync: EF sẽ bọc câu SQL vào subquery + LIMIT, FOR SHARE nằm trong derived table.
            var rows = await _context.Database
                .SqlQuery<bool>($"SELECT isVerified AS Value FROM employerprofile WHERE userId = {job.EmployerId} FOR SHARE")
                .ToListAsync();
            if (rows.Count == 0 || !rows[0]) return false; // không có profile = chưa xác minh; thoát không commit -> rollback
            _context.Jobs.Add(job); // chỉ Add sau khi đã xác minh, tránh entity Added còn trong tracker
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return true;
        }

        public Task<bool> UpdateContentAsync(Job job)
        {
            // job lấy từ GetByIdAsync đã được track. Không gọi Jobs.Update: nó đánh dấu cả Status/CreatedAt/EmployerId.
            // Đánh dấu mọi cột nội dung là đã đổi (kể cả cột EF thấy không đổi so với snapshot) -> UPDATE ghi đè nguyên bản request này,
            // 2 PUT cùng lúc thì bản sau thắng nguyên bản, không trộn field. Status không nằm ở SET, chỉ ở WHERE status=<cũ> (concurrency token, EF tự thêm khi có UPDATE)
            var entry = _context.Entry(job);
            foreach (var property in entry.Properties)
            {
                var name = property.Metadata.Name;
                if (property.Metadata.IsPrimaryKey() || name is nameof(Job.EmployerId) or nameof(Job.CreatedAt) or nameof(Job.Status)) continue;
                property.IsModified = true;
            }
            var salary = entry.Reference(j => j.Salary).TargetEntry;
            // phòng thủ; thực tế không xảy ra vì salaryType NOT NULL nên Job đọc từ DB luôn có Salary
            if (salary != null && salary.State != EntityState.Added)
                foreach (var property in salary.Properties.Where(p => !p.Metadata.IsPrimaryKey())) property.IsModified = true;
            return SaveOrReportConflictAsync(job);
        }

        // chỉ ghi Status (đã đổi trong tracker), không đụng nội dung PUT vừa lưu ở request khác
        public Task<bool> CloseAsync(Job job) => SaveOrReportConflictAsync(job);

        private async Task<bool> SaveOrReportConflictAsync(Job job)
        {
            try
            {
                await SaveRetryOnDeadlockAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.Entry(job).State = EntityState.Detached;
                return false;
            }
        }

        public async Task<JobDeleteResult> DeleteAsync(Job job)
        {
            try { return await DeleteOnceAsync(job); }
            catch (Exception ex) when (DbErrors.IsDeadlock(ex))
            {
                // tx đã bị rollback: làm lại từ đầu 1 lần (Business 2.4.1: ghi đồng thời không ra 500)
                _context.Entry(job).State = EntityState.Detached;
                return await DeleteOnceAsync(job);
            }
        }

        private async Task<JobDeleteResult> DeleteOnceAsync(Job job)
        {
            // InMemory (unit test) không có transaction / raw SQL / ExecuteDelete: nhánh này chỉ phục vụ test, race kiểm bằng API test
            if (!_context.Database.IsRelational())
            {
                _context.Entry(job).State = EntityState.Detached;
                var fresh = await _context.Jobs.FirstOrDefaultAsync(j => j.JobId == job.JobId);
                if (fresh == null) return JobDeleteResult.NotFound;
                if (await _context.Applications.AnyAsync(a => a.JobId == job.JobId)) return JobDeleteResult.HasApplications;
                _context.Jobs.Remove(fresh);
                await _context.SaveChangesAsync();
                return JobDeleteResult.Deleted;
            }

            // READ COMMITTED: tránh gap lock (giống EmployerController PUT me).
            // FOR UPDATE trên dòng job: INSERT application giữ khóa S trên dòng này khi kiểm FK, nên đơn đang nộp dở thì chờ nó commit rồi mới đếm
            // (thấy đơn -> HasApplications); xóa khóa trước thì INSERT đơn chờ rồi fail FK. Dùng ToListAsync, không SingleOrDefaultAsync (EF bọc subquery, FOR UPDATE nằm trong derived table)
            await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            var rows = await _context.Database
                .SqlQuery<string>($"SELECT jobId AS Value FROM job WHERE jobId = {job.JobId} FOR UPDATE")
                .ToListAsync();
            if (rows.Count == 0) return JobDeleteResult.NotFound; // thoát không commit -> rollback
            if (await _context.Applications.AnyAsync(a => a.JobId == job.JobId)) return JobDeleteResult.HasApplications;
            // đã giữ khóa dòng nên không cần token status: Job vừa bị đóng vẫn xóa được
            await _context.Jobs.Where(j => j.JobId == job.JobId).ExecuteDeleteAsync();
            await tx.CommitAsync();
            _context.Entry(job).State = EntityState.Detached;
            return JobDeleteResult.Deleted;
        }

        public async Task<Dictionary<string, int>> CountApplicationsByJobsAsync(IEnumerable<string> jobIds)
        {
            var ids = jobIds.ToList();
            if (ids.Count == 0) return new Dictionary<string, int>();
            return await _context.Applications.AsNoTracking()
                .Where(a => ids.Contains(a.JobId))
                .GroupBy(a => a.JobId)
                .Select(g => new { JobId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.JobId, x => x.Count);
        }

        public Task<int> CountApplicationsByJobAsync(string jobId) =>
            _context.Applications.AsNoTracking().CountAsync(a => a.JobId == jobId);

        public Task<int> CloseExpiredAsync(DateOnly today)
        {
            return CloseOpenAsync(_context.Jobs.Where(j => j.Deadline < today));
        }

        public Task<bool> HasApplicationAsync(string jobId, string finderId) =>
            _context.Applications.AnyAsync(a => a.JobId == jobId && a.FinderId == finderId);

        // load rồi sửa qua change tracker thay vì ExecuteUpdate: test được bằng InMemory (provider này không hỗ trợ ExecuteUpdateAsync).
        // shortcut: load hết Job cần đóng vào bộ nhớ, đổi sang ExecuteUpdateAsync nếu số Job đóng mỗi lần lên hàng chục nghìn
        private async Task<int> CloseOpenAsync(IQueryable<Job> query)
        {
            var jobs = await query.Where(j => j.Status == JobStatuses.Open).ToListAsync();
            // lưu từng Job: Job vừa bị request khác đóng -> bỏ qua, không làm hỏng cả lô (Business 2.4.1)
            var closed = 0;
            foreach (var job in jobs)
            {
                job.Status = JobStatuses.Closed;
                try
                {
                    await _context.SaveChangesAsync();
                    closed++;
                }
                catch (DbUpdateConcurrencyException)
                {
                    _context.Entry(job).State = EntityState.Detached;
                }
            }
            return closed;
        }
    }
}
