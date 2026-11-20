using backend.Common;
using backend.Constants;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

public class EmployerRepository : IEmployerRepository
{
    private readonly WorkHubContext _context;

    public EmployerRepository(WorkHubContext context) => _context = context;

    // buildQuery lọc + sắp xếp trên Employerprofile; ở đây mới Select và phân trang
    public Task<(List<AdminEmployerRow> Items, int TotalItems)> SearchForAdminAsync(
        Func<IQueryable<Employerprofile>, IQueryable<Employerprofile>> buildQuery, int page, int limit)
    {
        return buildQuery(_context.Employerprofiles.AsNoTracking())
            // đếm cả Job Open đã quá hạn chưa auto-close: đó là số Job unverify sẽ đóng
            .Select(p => new AdminEmployerRow(p, p.User.Email, p.User.EmailVerified, p.Jobs.Count(j => j.Status == JobStatuses.Open)))
            .ToPageAsync(page, limit);
    }

    public async Task<bool?> GetVerifyStateAsync(string userId) =>
        await _context.Employerprofiles.AsNoTracking()
            .Where(e => e.UserId == userId)
            .Select(e => (bool?)e.IsVerified)
            .FirstOrDefaultAsync();

    public async Task<(bool IsVerified, string CompanyName, string TaxCode)?> GetVerifySnapshotAsync(string userId)
    {
        var row = await _context.Employerprofiles.AsNoTracking()
            .Where(e => e.UserId == userId)
            .Select(e => new { e.IsVerified, e.CompanyName, e.TaxCode })
            .FirstOrDefaultAsync();
        return row == null ? null : (row.IsVerified, row.CompanyName, row.TaxCode);
    }

    // điều kiện nằm trong WHERE: Pomelo trả số dòng khớp, nên 0 = đã verify từ trước hoặc tên / MST vừa đổi.
    // utf8mb4_bin: collation mặc định bỏ qua hoa thường + dấu, đổi "Công ty" -> "Cong ty" sẽ lọt
    public async Task<bool> VerifyAsync(string userId, string companyName, string taxCode) =>
        await _context.Employerprofiles
            .Where(e => e.UserId == userId && !e.IsVerified
                && EF.Functions.Collate(e.CompanyName, "utf8mb4_bin") == companyName
                && EF.Functions.Collate(e.TaxCode, "utf8mb4_bin") == taxCode)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsVerified, true).SetProperty(e => e.UnverifyReason, (string?)null)) > 0;

    // deadlock với PATCH/PUT Job: MySQL rollback tx này (nạn nhân) -> chạy lại cả tx 1 lần (Business 2.4.1: không trả 500); lần 2 vẫn deadlock thì để global handler xử lý
    public async Task<int?> UnverifyAndCloseJobsAsync(string userId, string reason)
    {
        try { return await UnverifyAndCloseJobsOnceAsync(userId, reason); }
        catch (Exception ex) when (DbErrors.IsDeadlock(ex))
        {
            return await UnverifyAndCloseJobsOnceAsync(userId, reason);
        }
    }

    private async Task<int?> UnverifyAndCloseJobsOnceAsync(string userId, string reason)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        // Thứ tự khóa: UPDATE employerprofile PHẢI là lệnh đầu tiên trong tx (không SELECT thường trước nó) để lấy khóa ghi (X) trên dòng này;
        // tạo Job (JobRepository.AddIfEmployerVerifiedAsync, FOR SHARE) chờ khóa này nên không lọt Job Open sau khi thu hồi.
        // Job đóng bằng ExecuteUpdate (locking read, thấy cả Job vừa commit); đọc consistent rồi lưu từng Job sẽ sót Job vừa tạo.
        var revoked = await _context.Employerprofiles
            .Where(e => e.UserId == userId && e.IsVerified)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsVerified, false).SetProperty(e => e.UnverifyReason, reason));
        if (revoked == 0) return null; // đã bị thu hồi từ trước: thoát không commit -> rollback, giữ lý do cũ

        var closed = await _context.Jobs
            .Where(j => j.EmployerId == userId && j.Status == JobStatuses.Open)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, JobStatuses.Closed));
        await tx.CommitAsync();
        return closed;
    }
}
