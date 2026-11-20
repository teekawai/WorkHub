using backend.Common;
using backend.Constants;
using backend.DTO.JobDTO;
using backend.Models;
using backend.Repositories;

namespace backend.Services.jobs
{
    public class JobSearchService : IJobSearchService
    {
        private const string SortNewest = "newest";
        private const string SortSalaryDesc = "salary_desc";
        private const decimal SalaryCeiling = 1_000_000_000m;

        // 6 khoảng lương của dropdown FE, chỉ nhận đúng các cặp này (Business 1.3)
        private static readonly HashSet<(decimal Min, decimal Max)> SalaryRanges = new()
        {
            (0m, 10_000_000m), (10_000_000m, 15_000_000m), (15_000_000m, 20_000_000m),
            (20_000_000m, 30_000_000m), (30_000_000m, 50_000_000m), (50_000_000m, SalaryCeiling)
        };

        // experience -> YearOfExperience trong [Min, Max), Max null = không giới hạn trên; "none" = [0, 1) tức x = 0 (Business 1.4.1)
        private static readonly Dictionary<string, (int Min, int? Max)> ExperienceRanges = new()
        {
            ["none"] = (0, 1),
            ["1-3"] = (1, 3),
            ["3-5"] = (3, 5),
            ["5-10"] = (5, 10),
            ["10+"] = (10, null)
        };

        private readonly IJobRepository _repo;
        private readonly TimeProvider _timeProvider;

        public JobSearchService(IJobRepository repo, TimeProvider timeProvider)
        {
            _repo = repo;
            _timeProvider = timeProvider;
        }

        public async Task<ServiceResult<PagedResult<JobListItemDTO>>> SearchPublicAsync(JobQueryDTO query)
        {
            Normalize(query);
            var errors = Validate(query);
            if (errors.Count > 0) return ServiceResult<PagedResult<JobListItemDTO>>.ValidationFail(errors);

            var limit = Paging.ClampLimit(query.Limit);
            var today = VnTime.Today(_timeProvider.GetUtcNow().UtcDateTime);
            var (items, total) = await _repo.SearchAsync(jobs => Sort(Filter(jobs, query, today), query.SortBy), query.Page, limit);
            return ServiceResult<PagedResult<JobListItemDTO>>.Success(
                new PagedResult<JobListItemDTO>(items.Select(JobListItemDTO.FromJob).ToList(), Paging.Build(total, query.Page, limit)));
        }

        // trim chuỗi; rỗng / toàn khoảng trắng coi như không gửi filter đó
        private static void Normalize(JobQueryDTO query)
        {
            static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
            query.Keyword = Clean(query.Keyword);
            query.Category = Clean(query.Category);
            query.SubCategory = Clean(query.SubCategory);
            query.Location = Clean(query.Location);
            query.WorkType = Clean(query.WorkType);
            query.Experience = Clean(query.Experience);
            query.SortBy = Clean(query.SortBy) ?? SortNewest;
        }

        private static Dictionary<string, string[]> Validate(JobQueryDTO query)
        {
            var errors = new Dictionary<string, string[]>();
            void Invalid(string key) => errors[key] = new[] { JobRequestValidator.InvalidMessage };

            // giá trị filter phải thuộc danh sách cố định (Business 6.4.1, 1.5)
            if (query.Category != null && !JobCategories.Map.ContainsKey(query.Category)) Invalid("category");
            if (query.SubCategory != null)
            {
                if (query.Category == null) errors["subCategory"] = new[] { "Phải chọn category trước" };
                else if (!errors.ContainsKey("category") && !JobCategories.IsValid(query.Category, query.SubCategory)) Invalid("subCategory");
            }
            if (query.Location != null && !JobLocations.IsValid(query.Location)) Invalid("location");
            if (query.WorkType != null && !JobWorkTypes.IsValid(query.WorkType)) Invalid("workType");

            if (query.Keyword?.Length > SearchText.MaxKeywordLength) errors["keyword"] = new[] { $"Tối đa {SearchText.MaxKeywordLength} ký tự" };

            // khoảng lương phải đủ 2 đầu và là 1 trong 6 khoảng cho sẵn (Business 1.3)
            if (query.SalaryMin == null && query.SalaryMax != null) errors["salaryMin"] = new[] { "Phải gửi cả salaryMin và salaryMax" };
            else if (query.SalaryMin != null && query.SalaryMax == null) errors["salaryMax"] = new[] { "Phải gửi cả salaryMin và salaryMax" };
            else if (query.SalaryMin != null && !SalaryRanges.Contains((query.SalaryMin.Value, query.SalaryMax!.Value)))
                errors["salaryMin"] = new[] { "Khoảng lương không hợp lệ" };

            if (query.Experience != null && !ExperienceRanges.ContainsKey(query.Experience)) Invalid("experience");
            if (query.SortBy is not (SortNewest or SortSalaryDesc)) Invalid("sortBy");

            // Business 6.7
            foreach (var (key, messages) in Paging.Validate(query.Page, query.Limit)) errors[key] = messages;
            return errors;
        }

        // các filter kết hợp AND (Business 6.4); query đã qua Validate
        private static IQueryable<Job> Filter(IQueryable<Job> jobs, JobQueryDTO query, DateOnly today)
        {
            // điều kiện công khai (Business 6.2), còn hạn hết ngày Deadline (1.6)
            jobs = jobs.Where(j => j.Status == JobStatuses.Open && j.Deadline >= today && j.Employer.IsVerified);

            if (query.Keyword != null)
            {
                // Pomelo dịch thành LIKE '%...%' (tự escape % và _). Collation utf8mb4_unicode_ci đã bỏ qua hoa thường / dấu,
                // riêng 'đ' khác 'd' -> thay đ/Đ thành d ở cả 2 phía; REPLACE của MySQL phân biệt hoa thường nên thay cả 2 (Business 6.3)
                // shortcut: LIKE '%...%' không dùng được index -> quét bảng; đổi sang FULLTEXT khi số Job đủ lớn để chậm (đo trước)
                var keyword = SearchText.Normalize(query.Keyword);
                jobs = jobs.Where(j => j.JobTitle.Replace("đ", "d").Replace("Đ", "d").Contains(keyword)
                    || j.Employer.CompanyName.Replace("đ", "d").Replace("Đ", "d").Contains(keyword));
            }
            if (query.Category != null) jobs = jobs.Where(j => j.Category == query.Category);
            if (query.SubCategory != null) jobs = jobs.Where(j => j.SubCategory == query.SubCategory);
            if (query.Location != null) jobs = jobs.Where(j => j.Location == query.Location);
            if (query.WorkType != null) jobs = jobs.Where(j => j.WorkType == query.WorkType);

            if (query.SalaryMin != null)
            {
                decimal min = query.SalaryMin.Value, max = query.SalaryMax!.Value;
                // khoảng cuối (tới mức trần) tính cả biên trên để Job "Từ 1 tỷ" vẫn hiện
                var includeMax = max == SalaryCeiling;
                // Negotiable luôn hiện; có Max -> giao nhau; chỉ Min -> min <= SalaryMin < max (Business 1.3)
                jobs = jobs.Where(j => j.Salary.SalaryType == SalaryType.Negotiable
                    || (j.Salary.SalaryMax != null && j.Salary.SalaryMin <= max && j.Salary.SalaryMax >= min)
                    || (j.Salary.SalaryMax == null && j.Salary.SalaryMin >= min && (j.Salary.SalaryMin < max || (includeMax && j.Salary.SalaryMin == max))));
            }

            if (query.Experience != null)
            {
                var (minYears, maxYears) = ExperienceRanges[query.Experience];
                jobs = maxYears == null
                    ? jobs.Where(j => j.YearOfExperience >= minYears)
                    : jobs.Where(j => j.YearOfExperience >= minYears && j.YearOfExperience < maxYears);
            }
            return jobs;
        }

        // JobId làm tiêu chí phụ để phân trang ổn định khi trùng CreatedAt / mức lương (user chốt 2026-11-11)
        private static IQueryable<Job> Sort(IQueryable<Job> jobs, string? sortBy)
        {
            var sorted = sortBy == SortSalaryDesc
                // SalaryMax nếu có, không thì SalaryMin; Negotiable xuống cuối (Business 6.5, U14)
                ? jobs.OrderBy(j => j.Salary.SalaryType == SalaryType.Negotiable)
                    .ThenByDescending(j => j.Salary.SalaryMax ?? j.Salary.SalaryMin)
                : jobs.OrderByDescending(j => j.CreatedAt);
            return sorted.ThenBy(j => j.JobId);
        }
    }
}
