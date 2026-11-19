using backend.Constants;
using backend.DTO.JobDTO;
using backend.Models;

namespace backend.Services.jobs
{
    // Validate JobRequestDTO, gom tất cả lỗi theo field (Business 1.5.1)
    public static class JobRequestValidator
    {
        public const string RequiredMessage = "Không được bỏ trống";
        public const string InvalidMessage = "Giá trị không hợp lệ";

        private const int MaxDeadlineDays = 90;
        private const decimal MaxSalary = 999_000_000m;
        // Chênh lệch tối đa giữa lương tối đa và tối thiểu (Business 1.2), bằng 20 triệu vẫn hợp lệ
        private const decimal MaxSalarySpread = 20_000_000m;
        private const int MaxYearOfExperience = 50;
        private const int MaxNumberOfPosition = 50;

        public static Dictionary<string, string[]> Validate(JobRequestDTO request, DateOnly today)
        {
            var errors = new Dictionary<string, string[]>();

            CheckText(errors, "jobTitle", request.JobTitle, maxLength: 255, required: true);
            CheckText(errors, "description", request.Description, maxLength: 5000, required: true);
            CheckText(errors, "requirement", request.Requirement, maxLength: 5000, required: true);
            CheckText(errors, "applicantBenefit", request.ApplicantBenefit, maxLength: 5000, required: true);
            CheckText(errors, "skillRequired", request.SkillRequired, maxLength: 255, required: false);

            // subCategory chỉ báo khi category đã hợp lệ
            CheckOption(errors, "category", request.Category, category => JobCategories.Map.ContainsKey(category));
            if (!errors.ContainsKey("category") && !JobCategories.IsValid(request.Category!.Trim(), request.SubCategory?.Trim()))
                errors["subCategory"] = new[] { InvalidMessage };

            CheckOption(errors, "location", request.Location, JobLocations.IsValid);
            CheckOption(errors, "workType", request.WorkType, JobWorkTypes.IsValid);

            CheckSalary(errors, request);

            CheckRange(errors, "yearOfExperience", request.YearOfExperience, 0, MaxYearOfExperience, required: true,
                $"Phải từ 0 đến {MaxYearOfExperience}");
            CheckRange(errors, "numberOfPosition", request.NumberOfPosition, 1, MaxNumberOfPosition, required: true,
                $"Phải từ 1 đến {MaxNumberOfPosition}");
            CheckRange(errors, "deadline", request.Deadline, today, today.AddDays(MaxDeadlineDays), required: true,
                $"Phải từ hôm nay đến {MaxDeadlineDays} ngày tới");

            return errors;
        }

        // salaryType phải đúng "Range"/"Negotiable" (Ordinal, không trim)
        private static void CheckSalary(Dictionary<string, string[]> errors, JobRequestDTO request)
        {
            if (string.IsNullOrEmpty(request.SalaryType))
            {
                errors["salaryType"] = new[] { RequiredMessage };
                return;
            }
            if (request.SalaryType == nameof(SalaryType.Negotiable)) return;
            if (request.SalaryType != nameof(SalaryType.Range))
            {
                errors["salaryType"] = new[] { InvalidMessage };
                return;
            }

            CheckRange(errors, "salaryMin", request.SalaryMin, 0m, MaxSalary, required: true, InvalidMessage);
            CheckRange(errors, "salaryMax", request.SalaryMax, 0m, MaxSalary, required: false, InvalidMessage);

            if (!errors.ContainsKey("salaryMax") && request.SalaryMin > request.SalaryMax)
                errors["salaryMax"] = new[] { "Phải lớn hơn hoặc bằng lương tối thiểu" };

            // chỉ xét chênh lệch khi min, max đều hợp lệ và min <= max
            if (!errors.ContainsKey("salaryMin") && !errors.ContainsKey("salaryMax")
                && request.SalaryMax - request.SalaryMin > MaxSalarySpread)
                errors["salaryMax"] = new[] { "Không được cao hơn lương tối thiểu quá 20 triệu" };
        }

        private static void CheckText(Dictionary<string, string[]> errors, string key, string? value, int maxLength, bool required)
        {
            var text = value?.Trim();
            if (string.IsNullOrEmpty(text))
            {
                if (required) errors[key] = new[] { RequiredMessage };
            }
            else if (text.Length > maxLength) errors[key] = new[] { $"Tối đa {maxLength} ký tự" };
        }

        private static void CheckOption(Dictionary<string, string[]> errors, string key, string? value, Func<string, bool> isValid)
        {
            var text = value?.Trim();
            if (string.IsNullOrEmpty(text)) errors[key] = new[] { RequiredMessage };
            else if (!isValid(text)) errors[key] = new[] { InvalidMessage };
        }

        private static void CheckRange<T>(Dictionary<string, string[]> errors, string key, T? value, T min, T max,
            bool required, string outOfRangeMessage) where T : struct, IComparable<T>
        {
            if (value == null)
            {
                if (required) errors[key] = new[] { RequiredMessage };
            }
            else if (value.Value.CompareTo(min) < 0 || value.Value.CompareTo(max) > 0)
                errors[key] = new[] { outOfRangeMessage };
        }
    }
}
