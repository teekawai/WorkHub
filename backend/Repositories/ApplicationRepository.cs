using System.Globalization;
using backend.Common;
using backend.Constants;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly WorkHubContext _context;

        public ApplicationRepository(WorkHubContext context) => _context = context;

        public async Task<(bool Exists, string? Cv)> GetFinderCvAsync(string finderId)
        {
            var rows = await _context.Finderprofiles.AsNoTracking()
                .Where(f => f.UserId == finderId).Select(f => f.Cv).ToListAsync();
            return rows.Count == 0 ? (false, null) : (true, rows[0]);
        }

        public async Task<ApplyWriteResult> AddIfOpenAsync(Application app, string employerId, DateOnly today)
        {
            try { return await AddOnceAsync(app, employerId, today); }
            catch (Exception ex) when (DbErrors.IsDeadlock(ex))
            {
                _context.Entry(app).State = EntityState.Detached; // tx đã rollback, chạy lại tx 1 lần (Service không upload lại)
                return await AddOnceAsync(app, employerId, today);
            }
        }

        private async Task<ApplyWriteResult> AddOnceAsync(Application app, string employerId, DateOnly today)
        {
            // InMemory (unit test) không có transaction / raw SQL / unique index: nhánh này chỉ phục vụ test, race kiểm bằng API test
            if (!_context.Database.IsRelational())
            {
                var job = await _context.Jobs.AsNoTracking().FirstOrDefaultAsync(j => j.JobId == app.JobId);
                if (job == null || !await _context.Employerprofiles.AnyAsync(e => e.UserId == job.EmployerId && e.IsVerified)) return ApplyWriteResult.JobNotFound;
                if (job.Status == JobStatuses.Closed || job.Deadline < today) return ApplyWriteResult.JobNotOpen;
                if (await _context.Applications.AnyAsync(a => a.JobId == app.JobId && a.FinderId == app.FinderId)) return ApplyWriteResult.AlreadyApplied;
                _context.Applications.Add(app);
                await _context.SaveChangesAsync();
                return ApplyWriteResult.Created;
            }

            // READ COMMITTED: tránh gap lock giữa các request nộp cùng lúc.
           
            // Thứ tự khóa employerprofile -> job giống unverify (EmployerRepository); 2 câu riêng, không JOIN (optimizer tự chọn thứ tự khóa).
            // isVerified / status / deadline lấy từ chính câu SQL, không qua entity đã track (tránh dữ liệu cũ). Dùng ToListAsync, không Single (FOR SHARE rơi vào subquery).
            await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            var emp = await _context.Database
                .SqlQuery<bool>($"SELECT isVerified AS Value FROM employerprofile WHERE userId = {employerId} FOR SHARE")
                .ToListAsync();
            if (emp.Count == 0 || !emp[0]) return ApplyWriteResult.JobNotFound; // thoát không commit -> rollback

            var jobs = await _context.Database
                .SqlQuery<string>($"SELECT CONCAT(status, '|', DATE_FORMAT(deadline, '%Y-%m-%d')) AS Value FROM job WHERE jobId = {app.JobId} AND employerId = {employerId} FOR SHARE")
                .ToListAsync();
            if (jobs.Count == 0) return ApplyWriteResult.JobNotFound;
            var parts = jobs[0].Split('|');
            if (parts[0] == JobStatuses.Closed || DateOnly.ParseExact(parts[1], "yyyy-MM-dd", CultureInfo.InvariantCulture) < today)
                return ApplyWriteResult.JobNotOpen;

            try
            {
                _context.Applications.Add(app);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return ApplyWriteResult.Created;
            }
            catch (Exception ex) when (DbErrors.IsDuplicateKey(ex) || DbErrors.IsForeignKeyViolation(ex))
            {
                var duplicate = DbErrors.IsDuplicateKey(ex);
                _context.Entry(app).State = EntityState.Detached;
                return duplicate ? ApplyWriteResult.AlreadyApplied : ApplyWriteResult.JobNotFound;
            }
        }
    }
}
