using backend.Models;

namespace backend.Repositories
{
    // CRUD thuần trên bảng job, không chứa nghiệp vụ (validation, ownership nằm ở JobService)
    public interface IJobRepository
    {
        // kèm Employer; entity được track để Service sửa rồi gọi UpdateContentAsync / CloseAsync
        Task<Job?> GetByIdAsync(string jobId);

        // Job của 1 employer, mới nhất trước (Business 6.7), trả kèm tổng số để tính pagination
        Task<(List<Job> Items, int TotalItems)> GetByEmployerAsync(string employerId, int page, int limit);

        // tìm kiếm công khai: JobSearchService ghép điều kiện lọc + sắp xếp (nghiệp vụ Business 6), repo chỉ đếm + lấy 1 trang (kèm Employer)
        Task<(List<Job> Items, int TotalItems)> SearchAsync(Func<IQueryable<Job>, IQueryable<Job>> buildQuery, int page, int limit);

        // false = Employer không còn xác minh (hoặc không có profile) -> không insert. Đọc IsVerified có khóa ngay trước insert để Job Open không lọt lưới khi Admin unverify cùng lúc (Business 3.4.1)
        Task<bool> AddIfEmployerVerifiedAsync(Job job);
        // false = Status đã bị request khác đổi (hoặc Job đã bị xóa) -> entity bị detach, Service đọc lại để quyết định mã lỗi (Business 2.4.1)
        // PUT: ghi đè toàn bộ nội dung Job được phép sửa (kể cả Salary) -> request sau thắng nguyên bản, không trộn field 2 request
        Task<bool> UpdateContentAsync(Job job);

        // PATCH đóng: chỉ ghi Status, không đụng nội dung PUT vừa lưu
        Task<bool> CloseAsync(Job job);

        // false = Job đã bị xóa bởi request khác. Job vừa bị đóng vẫn xóa được (reload rồi thử lại 1 lần)
        Task<bool> DeleteAsync(Job job);

        // đóng mọi Job Open có Deadline < today (auto-close — Business 2.3), trả số Job đã đóng (bỏ qua Job vừa bị request khác đóng)
        Task<int> CloseExpiredAsync(DateOnly today);

    }
}
