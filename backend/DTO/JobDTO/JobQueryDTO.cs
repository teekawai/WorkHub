namespace backend.DTO.JobDTO
{
    // query string của GET /api/jobs (Business 6.3–6.7). Mọi filter optional, chuỗi rỗng / toàn khoảng trắng coi như không gửi
    public class JobQueryDTO
    {
        public string? Keyword { get; set; }
        public string? Category { get; set; }
        public string? SubCategory { get; set; }
        public string? Location { get; set; }
        public string? WorkType { get; set; }

        // khoảng lương VND, phải gửi đủ 2 đầu (Business 1.3)
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        // none / 1-3 / 3-5 / 5-10 / 10+ (Business 1.4.1)
        public string? Experience { get; set; }

        // newest (mặc định) / salary_desc (Business 6.5)
        public string? SortBy { get; set; }

        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 30;
    }
}
