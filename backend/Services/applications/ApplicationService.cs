using backend.Common;
using backend.Constants;
using backend.DTO.ApplicationDTO;
using backend.Models;
using backend.Repositories;
using backend.Services.files;

namespace backend.Services.applications
{
    // Ứng tuyển Job (Business 2). Thứ tự: hồ sơ 403 > validate 400 > job 404 > đóng/hết hạn 409 > đã nộp 409 > upload > ghi trong tx
    public class ApplicationService : IApplicationService
    {
        private const string CvFolder = "WorkHub/applications";

        private readonly IApplicationRepository _repo;
        private readonly IJobRepository _jobRepo;
        private readonly IFileUploadService _files;
        private readonly TimeProvider _timeProvider;

        public ApplicationService(IApplicationRepository repo, IJobRepository jobRepo, IFileUploadService files, TimeProvider timeProvider)
        {
            _repo = repo;
            _jobRepo = jobRepo;
            _files = files;
            _timeProvider = timeProvider;
        }

        public async Task<ServiceResult<ApplicationResponseDTO>> ApplyAsync(string finderId, string jobId, ApplyRequestDTO request)
        {
            var (hasProfile, profileCv) = await _repo.GetFinderCvAsync(finderId);
            if (!hasProfile)
                return Fail(ErrorCode.Forbidden, "Vui lòng tạo hồ sơ trước khi ứng tuyển", ApiErrorCodes.FinderProfileNotFound);

            var errors = ApplyRequestValidator.Validate(request, profileCv);
            if (errors.Count > 0) return ServiceResult<ApplicationResponseDTO>.ValidationFail(errors);

            var now = _timeProvider.GetUtcNow().UtcDateTime;
            var today = VnTime.Today(now);

            var job = await _jobRepo.GetByIdAsync(jobId);
            if (job == null || !job.Employer.IsVerified) return JobNotFound();
            if (job.Status == JobStatuses.Closed || job.Deadline < today) return JobNotOpen();
            if (await _jobRepo.HasApplicationAsync(jobId, finderId)) return AlreadyApplied();

            // ApplicationId sinh trước để làm publicId file CV
            var applicationId = Guid.NewGuid().ToString();
            // folder đã chứa WorkHub/applications: publicId chỉ là id, nếu không Cloudinary lặp folder và file xóa không khớp (B1)
            var upload = request.UseProfileCv
                ? await _files.CopyFromUrlAsync(profileCv!, CvFolder, applicationId)
                : await _files.Upload_CV_AVT(request.CvFile!, CvFolder, applicationId, ApplyRequestValidator.CvExtensions, ApplyRequestValidator.MaxCvBytes, isRaw: true);
            // validator đã chặn đuôi / cỡ / file rỗng nên mọi Fail ở đây là lỗi Cloudinary
            if (!upload.IsSuccess) return Fail(ErrorCode.ServiceUnavailable, upload.ErrorMessage!, ApiErrorCodes.ServiceUnavailable);

            var coverLetter = request.CoverLetter?.Trim();
            var app = new Application
            {
                ApplicationId = applicationId,
                FinderId = finderId,
                JobId = jobId,
                Status = ApplicationStatuses.Pending,
                AppliedAt = new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc), // cột datetime không có giây lẻ, giữ Kind Utc để JSON có Z
                CoverLetter = string.IsNullOrEmpty(coverLetter) ? null : coverLetter,
                FullName = request.FullName!.Trim(),
                Email = request.Email!.Trim(),
                CvUrl = upload.Url!
            };

            ApplyWriteResult written;
            try { written = await _repo.AddIfOpenAsync(app, job.EmployerId, today); }
            catch
            {
                await DeleteUploadedAsync(upload); // TR-1: không để file mồ côi
                throw;
            }

            if (written == ApplyWriteResult.Created)
                return ServiceResult<ApplicationResponseDTO>.Success(ApplicationResponseDTO.FromApplication(app));

            await DeleteUploadedAsync(upload);
            return written switch
            {
                ApplyWriteResult.JobNotFound => JobNotFound(),
                ApplyWriteResult.JobNotOpen => JobNotOpen(),
                _ => AlreadyApplied()
            };
        }

        // xóa theo publicId Cloudinary trả về, không tự ghép chuỗi
        private Task<bool> DeleteUploadedAsync(FileUploadResult upload) =>
            _files.DeleteFileAsync(upload.PublicId!, isRaw: true);

        private static ServiceResult<ApplicationResponseDTO> Fail(ErrorCode code, string message, string key) =>
            ServiceResult<ApplicationResponseDTO>.Fail(code, message, key);

        private static ServiceResult<ApplicationResponseDTO> JobNotFound() =>
            Fail(ErrorCode.NotFound, "Không tìm thấy tin tuyển dụng", ApiErrorCodes.JobNotFound);

        private static ServiceResult<ApplicationResponseDTO> JobNotOpen() =>
            Fail(ErrorCode.Conflict, "Tin tuyển dụng đã đóng hoặc hết hạn", ApiErrorCodes.JobNotOpen);

        private static ServiceResult<ApplicationResponseDTO> AlreadyApplied() =>
            Fail(ErrorCode.Conflict, "Bạn đã ứng tuyển việc này", ApiErrorCodes.AlreadyApplied);
    }
}
