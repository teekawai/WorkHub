namespace backend.DTO.JobDTO
{
    // Job trả về cho POST/PUT/PATCH và từng item của danh sách (Business 5.2), kèm tên + logo công ty
    public class JobResponseDTO
    {
        public string JobId { get; set; } = null!;
        public string JobTitle { get; set; } = null!;
        public string Category { get; set; } = null!;
        public string? SubCategory { get; set; }
        public string Location { get; set; } = null!;
        public string WorkType { get; set; } = null!;
        public string? SkillRequired { get; set; }
        public string Description { get; set; } = null!;
        public string Requirement { get; set; } = null!;
        public string ApplicantBenefit { get; set; } = null!;

        // "Range" / "Negotiable"
        public string SalaryType { get; set; } = null!;
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        public int YearOfExperience { get; set; }
        public int NumberOfPosition { get; set; }
        public DateOnly Deadline { get; set; }
        public string Status { get; set; } = null!;

        // UTC, Kind = Utc để JSON có hậu tố Z (Business 1.6)
        public DateTime CreatedAt { get; set; }

        public string CompanyName { get; set; } = null!;
        public string? Logo { get; set; }

        // Số đơn (mọi trạng thái): chỉ 2 API của Employer (danh sách + chi tiết) gán; còn lại null -> không có field trong JSON
        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public int? ApplicationCount { get; set; }

        // job phải đã Include Employer
        public static JobResponseDTO FromJob(Models.Job job)
        {
            var dto = new JobResponseDTO();
            CopyFrom(dto, job);
            return dto;
        }

        // copy field chung, để JobDetailResponseDTO dùng lại
        protected static void CopyFrom(JobResponseDTO dto, Models.Job job)
        {
            dto.JobId = job.JobId;
            dto.JobTitle = job.JobTitle;
            dto.Category = job.Category;
            dto.SubCategory = job.SubCategory;
            dto.Location = job.Location;
            dto.WorkType = job.WorkType;
            dto.SkillRequired = job.SkillRequired;
            dto.Description = job.Description;
            dto.Requirement = job.Requirement;
            dto.ApplicantBenefit = job.ApplicantBenefit;
            dto.SalaryType = job.Salary.SalaryType.ToString();
            dto.SalaryMin = job.Salary.SalaryMin;
            dto.SalaryMax = job.Salary.SalaryMax;
            dto.YearOfExperience = job.YearOfExperience;
            dto.NumberOfPosition = job.NumberOfPosition;
            dto.Deadline = job.Deadline;
            dto.Status = job.Status;
            dto.CreatedAt = DateTime.SpecifyKind(job.CreatedAt, DateTimeKind.Utc);
            dto.CompanyName = job.Employer.CompanyName;
            dto.Logo = job.Employer.Logo;
        }
    }
}
