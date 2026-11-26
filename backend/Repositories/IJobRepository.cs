using backend.Models;

namespace backend.Repositories
{
    public enum JobDeleteResult { Deleted, NotFound, HasApplications }

    // CRUD thuần trên bảng job, không chứa nghiệp vụ (validation, ownership nằm ở JobService)
    public interface IJobRepository
    {
        // kèm Employer; entity được track để Service sửa rồi gọi UpdateContentAsync / CloseAsync
        Task<Job?> GetByIdAsync(string jobId);

        // Job của 1 employer, mới nhất trước (Business 6.7), trả kèm tổng số để tính pagination
        Task<(List<Job> Items, int TotalItems)> GetByEmployerAsync(string employerId, int page, int limit, string? keyword, string? status, DateOnly today);

        // tìm kiếm công khai: JobSearchService ghép điều kiện lọc + sắp xếp (nghiệp vụ Business 6), repo chỉ đếm + lấy 1 trang (kèm Employer)
        Task<(List<Job> Items, int TotalItems)> SearchAsync(Func<IQueryable<Job>, IQueryable<Job>> buildQuery, int page, int limit);

        // false = Employer không còn xác minh (hoặc không có profile) -> không insert. Đọc IsVerified có khóa ngay trước insert để Job Open không lọt lưới khi Admin unverify cùng lúc (Business 3.4.1)
        Task<bool> AddIfEmployerVerifiedAsync(Job job);
        // false = Status đã bị request khác đổi (hoặc Job đã bị xóa) -> entity bị detach, Service đọc lại để quyết định mã lỗi (Business 2.4.1)
        // PUT: ghi đè toàn bộ nội dung Job được phép sửa (kể cả Salary) -> request sau thắng nguyên bản, không trộn field 2 request
        Task<bool> UpdateContentAsync(Job job);

        // PATCH đóng: chỉ ghi Status, không đụng nội dung PUT vừa lưu
        Task<bool> CloseAsync(Job job);

        // Kiểm "có đơn" và xóa trong cùng transaction (Business 5). NotFound = Job đã bị xóa bởi request khác; HasApplications = Job có đơn (mọi trạng thái) -> không xóa gì. Job vừa bị đóng vẫn xóa được
        Task<JobDeleteResult> DeleteAsync(Job job);

        // số đơn của từng Job trong 1 query; Job không có đơn không có key (Service dùng GetValueOrDefault)
        Task<Dictionary<string, int>> CountApplicationsByJobsAsync(IEnumerable<string> jobIds);

        // số đơn (mọi trạng thái) của 1 Job
        Task<int> CountApplicationsByJobAsync(string jobId);

        // đóng mọi Job Open có Deadline < today (auto-close — Business 2.3), trả số Job đã đóng (bỏ qua Job vừa bị request khác đóng)
        Task<int> CloseExpiredAsync(DateOnly today);

        // Finder đã nộp đơn cho Job này chưa
        Task<bool> HasApplicationAsync(string jobId, string finderId);

    }
}
