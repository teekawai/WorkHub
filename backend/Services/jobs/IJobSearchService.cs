using backend.Common;
using backend.DTO.JobDTO;

namespace backend.Services.jobs
{
    // Tìm kiếm Job công khai (GET /api/jobs), tách khỏi IJobService (CodingRules — ISP)
    public interface IJobSearchService
    {
        // chỉ Job Open + còn hạn + Employer đã xác minh (Business 6.2); filter/sort/phân trang theo Business 6.3–6.7
        Task<ServiceResult<PagedResult<JobListItemDTO>>> SearchPublicAsync(JobQueryDTO query);
    }
}
