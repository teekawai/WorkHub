using backend.Common;
using backend.Constants;
using backend.DTO.JobDTO;
using backend.Models;
using backend.Repositories;

namespace backend.Services.jobs
{
    public class JobService : IJobService
    {

        private readonly IJobRepository _repo;
        private readonly TimeProvider _timeProvider;

        public JobService(IJobRepository repo, TimeProvider timeProvider)
        {
            _repo = repo;
            _timeProvider = timeProvider;
        }

        private DateTime UtcNow => _timeProvider.GetUtcNow().UtcDateTime;

        public async Task<ServiceResult<JobResponseDTO>> CreateByEmployerAsync(string employerId, JobRequestDTO request)
        {
            var errors = JobRequestValidator.Validate(request, VnTime.Today(UtcNow));
            if (errors.Count > 0) return ServiceResult<JobResponseDTO>.ValidationFail(errors);

            var createdAt = TruncateToSecond(UtcNow); // cột datetime không có phần lẻ giây (Business 1.6)
            var job = new Job
            {
                JobId = Guid.NewGuid().ToString(),
                EmployerId = employerId,
                Status = JobStatuses.Open,
                CreatedAt = createdAt,
                UpdatedAt = createdAt // cùng giá trị, không đọc giờ lần 2 (Business 5.1)
            };
            CopyRequestToJob(job, request);
            if (!await _repo.AddIfEmployerVerifiedAsync(job))
                return ServiceResult<JobResponseDTO>.Fail(ErrorCode.Forbidden, "Công ty chưa được xác minh, không thể đăng tin", ApiErrorCodes.EmployerNotVerified);

            // đọc lại để có Employer (CompanyName/Logo) trong response
            var saved = await _repo.GetByIdAsync(job.JobId);
            return ServiceResult<JobResponseDTO>.Success(JobResponseDTO.FromJob(saved!));
        }

        public async Task<ServiceResult<JobResponseDTO>> UpdateByOwnerAsync(string employerId, string jobId, JobRequestDTO request)
        {
            var (job, fail) = await FindOwnedJobAsync<JobResponseDTO>(employerId, jobId);
            if (job == null) return fail!;

            // Job đã đóng hoặc quá hạn không sửa được (Business 2.6)
            if (job.Status == JobStatuses.Closed || job.Deadline < VnTime.Today(UtcNow))
                return ServiceResult<JobResponseDTO>.Fail(ErrorCode.Conflict, "Tin tuyển dụng đã đóng hoặc hết hạn, không thể chỉnh sửa", ApiErrorCodes.JobNotEditable);

            var errors = JobRequestValidator.Validate(request, VnTime.Today(UtcNow));
            if (errors.Count > 0) return ServiceResult<JobResponseDTO>.ValidationFail(errors);

            CopyRequestToJob(job, request);
            job.UpdatedAt = TruncateToSecond(UtcNow); // MySQL datetime làm tròn phần lẻ giây nên phải cắt (Business 1.6, 5.1)
            if (!await _repo.UpdateContentAsync(job))
            {
                // Status đổi giữa lúc đọc và ghi: đã xóa -> 404, đã đóng -> JOB_NOT_EDITABLE (Business 2.4.1)
                return await _repo.GetByIdAsync(jobId) == null
                    ? JobNotFound<JobResponseDTO>()
                    : ServiceResult<JobResponseDTO>.Fail(ErrorCode.Conflict, "Tin tuyển dụng đã đóng hoặc hết hạn, không thể chỉnh sửa", ApiErrorCodes.JobNotEditable);
            }
            return ServiceResult<JobResponseDTO>.Success(JobResponseDTO.FromJob(job));
        }

        public async Task<ServiceResult<JobResponseDTO>> CloseByOwnerAsync(string employerId, string jobId, JobStatusDTO request)
        {
            var (job, fail) = await FindOwnedJobAsync<JobResponseDTO>(employerId, jobId);
            if (job == null) return fail!;

            if (!string.Equals(request.Status, JobStatuses.Closed, StringComparison.Ordinal))
                return ServiceResult<JobResponseDTO>.ValidationFail(new Dictionary<string, string[]> { ["status"] = new[] { "Chỉ chấp nhận giá trị Closed" } });

            if (job.Status == JobStatuses.Closed)
                return ServiceResult<JobResponseDTO>.Fail(ErrorCode.Conflict, "Tin tuyển dụng đã đóng", ApiErrorCodes.JobAlreadyClosed);

            job.Status = JobStatuses.Closed;
            if (!await _repo.CloseAsync(job))
            {
                return await _repo.GetByIdAsync(jobId) == null
                    ? JobNotFound<JobResponseDTO>()
                    : ServiceResult<JobResponseDTO>.Fail(ErrorCode.Conflict, "Tin tuyển dụng đã đóng", ApiErrorCodes.JobAlreadyClosed);
            }
            return ServiceResult<JobResponseDTO>.Success(JobResponseDTO.FromJob(job));
        }

        public async Task<ServiceResult<bool>> DeleteByOwnerAsync(string employerId, string jobId)
        {
            var (job, fail) = await FindOwnedJobAsync<bool>(employerId, jobId);
            if (job == null) return fail!;

            return await _repo.DeleteAsync(job) switch
            {
                JobDeleteResult.Deleted => ServiceResult<bool>.Success(true),
                JobDeleteResult.HasApplications => ServiceResult<bool>.Fail(ErrorCode.Conflict, "Tin tuyển dụng đã có đơn ứng tuyển nên không thể xóa. Bạn có thể đóng tin", ApiErrorCodes.JobHasApplications),
                _ => JobNotFound<bool>()
            };
        }

        public async Task<ServiceResult<JobDetailResponseDTO>> GetPublicDetailAsync(string jobId, string? finderId = null)
        {
            var job = await _repo.GetByIdAsync(jobId);
            // công ty chưa xác minh trả cùng 404, không lộ lý do (Business 5.1)
            if (job == null || !job.Employer.IsVerified) return JobNotFound<JobDetailResponseDTO>();
            var dto = JobDetailResponseDTO.FromJobWithCompany(job);
            dto.HasApplied = finderId != null && await _repo.HasApplicationAsync(jobId, finderId);
            return ServiceResult<JobDetailResponseDTO>.Success(dto);
        }

        public async Task<ServiceResult<PagedResult<JobResponseDTO>>> GetListForOwnerAsync(string employerId, int page, int limit, string? keyword = null, string? status = null)
        {
            // trim; rỗng / toàn khoảng trắng = không lọc (Business 5.1)
            keyword = string.IsNullOrWhiteSpace(keyword) ? null : keyword.Trim();
            status = string.IsNullOrWhiteSpace(status) ? null : status.Trim();

            var errors = Paging.Validate(page, limit); // gộp lỗi 4 field vào 1 lần trả
            if (keyword?.Length > SearchText.MaxKeywordLength) errors["keyword"] = new[] { SearchText.KeywordTooLongMessage };
            if (status != null && !OwnerJobStatus.IsValid(status)) errors["status"] = new[] { JobRequestValidator.InvalidMessage };
            if (errors.Count > 0) return ServiceResult<PagedResult<JobResponseDTO>>.ValidationFail(errors);

            limit = Paging.ClampLimit(limit);
            var (items, total) = await _repo.GetByEmployerAsync(employerId, page, limit, keyword, status, VnTime.Today(UtcNow));
            // đếm đơn cả trang trong 1 query; Job không có đơn không có key -> 0 (không để null vì null làm mất field trong JSON)
            var counts = await _repo.CountApplicationsByJobsAsync(items.Select(j => j.JobId));
            var dtos = items.Select(j =>
            {
                var dto = JobResponseDTO.FromJob(j);
                dto.ApplicationCount = counts.GetValueOrDefault(j.JobId);
                dto.UpdatedAt = DateTime.SpecifyKind(j.UpdatedAt, DateTimeKind.Utc); // đọc từ DB là Unspecified -> thiếu Z
                return dto;
            }).ToList();
            return ServiceResult<PagedResult<JobResponseDTO>>.Success(
                new PagedResult<JobResponseDTO>(dtos, Paging.Build(total, page, limit)));
        }

        public async Task<ServiceResult<JobDetailResponseDTO>> GetDetailForOwnerAsync(string employerId, string jobId)
        {
            var (job, fail) = await FindOwnedJobAsync<JobDetailResponseDTO>(employerId, jobId);
            if (job == null) return fail!;
            var dto = JobDetailResponseDTO.FromJobWithCompany(job);
            dto.ApplicationCount = await _repo.CountApplicationsByJobAsync(jobId);
            dto.UpdatedAt = DateTime.SpecifyKind(job.UpdatedAt, DateTimeKind.Utc);
            return ServiceResult<JobDetailResponseDTO>.Success(dto);
        }

        private static ServiceResult<T> JobNotFound<T>() =>
            ServiceResult<T>.Fail(ErrorCode.NotFound, "Không tìm thấy tin tuyển dụng", ApiErrorCodes.JobNotFound);

        // 404 nếu không có, 403 nếu khác chủ (Business 3.2)
        private async Task<(Job? Job, ServiceResult<T>? Fail)> FindOwnedJobAsync<T>(string employerId, string jobId)
        {
            var job = await _repo.GetByIdAsync(jobId);
            if (job == null) return (null, JobNotFound<T>());
            if (job.EmployerId != employerId)
                return (null, ServiceResult<T>.Fail(ErrorCode.Forbidden, "Bạn không có quyền với tin tuyển dụng này", ApiErrorCodes.NotJobOwner));
            return (job, null);
        }

        // chỉ gọi sau khi Validate pass; không đụng JobId/EmployerId/Status/CreatedAt
        private static void CopyRequestToJob(Job job, JobRequestDTO request)
        {
            var negotiable = request.SalaryType == nameof(SalaryType.Negotiable);
            job.JobTitle = request.JobTitle!.Trim();
            job.Category = request.Category!.Trim();
            job.SubCategory = TrimToNull(request.SubCategory);
            job.Location = request.Location!.Trim();
            job.WorkType = request.WorkType!.Trim();
            job.SkillRequired = TrimToNull(request.SkillRequired);
            job.Description = request.Description!.Trim();
            job.Requirement = request.Requirement!.Trim();
            job.ApplicantBenefit = request.ApplicantBenefit!.Trim();
            // gán vào Salary đang track (không new): owned mới ở trạng thái Added làm EF bỏ qua cột lương khi PUT ghi đè
            job.Salary ??= new Salary();
            job.Salary.SalaryType = negotiable ? SalaryType.Negotiable : SalaryType.Range;
            job.Salary.SalaryMin = negotiable ? null : request.SalaryMin;
            job.Salary.SalaryMax = negotiable ? null : request.SalaryMax;
            job.YearOfExperience = request.YearOfExperience!.Value;
            job.NumberOfPosition = request.NumberOfPosition!.Value;
            job.Deadline = request.Deadline!.Value;
        }

        private static DateTime TruncateToSecond(DateTime utc) => new(utc.Ticks - utc.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);

        private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
