namespace backend.DTO.JobDTO
{
    // Body POST/PUT /api/jobs. Không có field hệ thống (JobId, Status, CreatedAt, EmployerId — Business 2.2).
    // Mọi field để nullable, validation (trim, độ dài, danh sách cố định, khoảng giá trị) nằm ở JobService
    // để trả lỗi theo từng field và test được (Business 1.5.1)
    public class JobRequestDTO
    {
        public string? JobTitle { get; set; }
        public string? Category { get; set; }
        public string? SubCategory { get; set; }
        public string? Location { get; set; }
        public string? WorkType { get; set; }
        public string? SkillRequired { get; set; }
        public string? Description { get; set; }
        public string? Requirement { get; set; }
        public string? ApplicantBenefit { get; set; }

        // "Range" / "Negotiable" (Business 1.2)
        public string? SalaryType { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        public int? YearOfExperience { get; set; }
        public int? NumberOfPosition { get; set; }

        // yyyy-MM-dd theo lịch VN (Business 1.6)
        public DateOnly? Deadline { get; set; }
    }
}
