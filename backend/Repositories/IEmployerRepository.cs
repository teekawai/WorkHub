using backend.Models;

namespace backend.Repositories;

// 1 dòng danh sách công ty cho admin
public record AdminEmployerRow(Employerprofile Profile, string Email, bool EmailVerified, int OpenJobCount);

public interface IEmployerRepository
{
    Task<(List<AdminEmployerRow> Items, int TotalItems)> SearchForAdminAsync(
        Func<IQueryable<Employerprofile>, IQueryable<Employerprofile>> buildQuery, int page, int limit);

    // null = không có profile; chạy NGOÀI transaction
    Task<bool?> GetVerifyStateAsync(string userId);

    // null = không có profile; đọc trạng thái + tên/MST hiện tại để phân biệt "tên/MST đổi" với "trạng thái bị đảo"; chạy NGOÀI transaction
    Task<(bool IsVerified, string CompanyName, string TaxCode)?> GetVerifySnapshotAsync(string userId);

    // true nếu có dòng đổi (chưa verify -> verify, tên + MST khớp đúng từng ký tự); xóa lý do thu hồi. Không đụng Job
    Task<bool> VerifyAsync(string userId, string companyName, string taxCode);

    // 1 transaction: thu hồi + đóng mọi Job Open. null = đã bị thu hồi từ trước (không đổi gì); ngược lại là số Job đã đóng
    Task<int?> UnverifyAndCloseJobsAsync(string userId, string reason);
}
