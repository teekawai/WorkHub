using backend.Common;
using backend.DTO.JobDTO;

namespace backend.Services.jobs
{
    // Nghiệp vụ Job (Business 1–5). employerId lấy từ JWT ở Controller rồi truyền vào, Service không đọc HttpContext.
    // "ByOwner"/"ForOwner": có kiểm tra Job thuộc employerId (404 không có, 403 khác chủ — Business 3.2)
    public interface IJobService
    {
        // Employer đăng Job mới: tự set Status Open, CreatedAt, EmployerId (Business 2.2)
        Task<ServiceResult<JobResponseDTO>> CreateByEmployerAsync(string employerId, JobRequestDTO request);

        // chỉ sửa được Job Open + còn hạn (Business 2.6)
        Task<ServiceResult<JobResponseDTO>> UpdateByOwnerAsync(string employerId, string jobId, JobRequestDTO request);

        // Open -> Closed một chiều (Business 2.4)
        Task<ServiceResult<JobResponseDTO>> CloseByOwnerAsync(string employerId, string jobId, JobStatusDTO request);

        Task<ServiceResult<bool>> DeleteByOwnerAsync(string employerId, string jobId);

        // Finder/khách xem chi tiết: Job của Employer chưa xác minh trả 404 như Job không tồn tại (Business 5.1)
        Task<ServiceResult<JobDetailResponseDTO>> GetPublicDetailAsync(string jobId);

        // danh sách Job của chính Employer, phân trang (Business 5.2, 6.7)
        Task<ServiceResult<PagedResult<JobResponseDTO>>> GetListForOwnerAsync(string employerId, int page, int limit);

        // chi tiết 1 Job của chính Employer, không lọc Status/Deadline/IsVerified (Business 5.3)
        Task<ServiceResult<JobDetailResponseDTO>> GetDetailForOwnerAsync(string employerId, string jobId);
    }
}
