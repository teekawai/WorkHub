using backend.Models;

namespace backend.Repositories
{
    public enum ApplyWriteResult { Created, JobNotFound, JobNotOpen, AlreadyApplied }

    public interface IApplicationRepository
    {
        // đọc thẳng DB (không qua cache) để CV luôn mới nhất
        Task<(bool Exists, string? Cv)> GetFinderCvAsync(string finderId);

        // ghi đơn trong tx ngắn: khóa FOR SHARE employerprofile rồi job, kiểm lại, INSERT (Business 2.2)
        Task<ApplyWriteResult> AddIfOpenAsync(Application app, string employerId, DateOnly today);
    }
}
