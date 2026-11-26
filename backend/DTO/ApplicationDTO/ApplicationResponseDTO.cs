using backend.Models;

namespace backend.DTO.ApplicationDTO
{
    // Response 201 (Business 2.4): không có finderId / dữ liệu nhạy cảm
    public class ApplicationResponseDTO
    {
        public string ApplicationId { get; set; } = null!;
        public string JobId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string CvUrl { get; set; } = null!;
        public string? CoverLetter { get; set; }
        public string Status { get; set; } = null!;
        public DateTime AppliedAt { get; set; }

        public static ApplicationResponseDTO FromApplication(Application a) => new()
        {
            ApplicationId = a.ApplicationId, JobId = a.JobId, FullName = a.FullName, Email = a.Email, CvUrl = a.CvUrl,
            CoverLetter = a.CoverLetter, Status = a.Status,
            AppliedAt = DateTime.SpecifyKind(a.AppliedAt, DateTimeKind.Utc) // DB trả Kind Unspecified -> JSON thiếu Z
        };
    }
}
