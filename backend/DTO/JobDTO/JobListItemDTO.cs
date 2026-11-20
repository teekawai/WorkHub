namespace backend.DTO.JobDTO
{
    // 1 Job trong kết quả GET /api/jobs, chỉ field cần cho card (user chốt 2026-11-11); công ty chỉ có tên + logo (Business 5.4)
    public class JobListItemDTO
    {
        public string JobId { get; set; } = null!;
        public string JobTitle { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string? Logo { get; set; }
        public string Location { get; set; } = null!;

        // "Range" / "Negotiable"; Negotiable thì Min/Max null (Business 1.2)
        public string SalaryType { get; set; } = null!;
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        // Số năm kinh nghiệm yêu cầu (Business 7, user chốt 2026-11-17)
        public int YearOfExperience { get; set; }

        // UTC, Kind = Utc để JSON có hậu tố Z (Business 1.6)
        public DateTime CreatedAt { get; set; }

        // job phải đã Include Employer
        public static JobListItemDTO FromJob(Models.Job job) => new()
        {
            JobId = job.JobId,
            JobTitle = job.JobTitle,
            CompanyName = job.Employer.CompanyName,
            Logo = job.Employer.Logo,
            Location = job.Location,
            SalaryType = job.Salary.SalaryType.ToString(),
            SalaryMin = job.Salary.SalaryMin,
            SalaryMax = job.Salary.SalaryMax,
            YearOfExperience = job.YearOfExperience,
            CreatedAt = DateTime.SpecifyKind(job.CreatedAt, DateTimeKind.Utc)
        };
    }
}
