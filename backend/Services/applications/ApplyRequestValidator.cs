using System.ComponentModel.DataAnnotations;
using backend.DTO.ApplicationDTO;
using backend.Services.jobs;

namespace backend.Services.applications
{
    // Validate form ứng tuyển, mỗi key 1 message (Business 1.2, 2.3)
    public static class ApplyRequestValidator
    {
        public static readonly string[] CvExtensions = { ".pdf", ".doc", ".docx" };
        public const long MaxCvBytes = 5 * 1024 * 1024;

        public static Dictionary<string, string[]> Validate(ApplyRequestDTO r, string? profileCv)
        {
            var errors = new Dictionary<string, string[]>();

            var name = r.FullName?.Trim();
            if (string.IsNullOrEmpty(name)) errors["fullName"] = new[] { "Vui lòng nhập họ và tên." };
            else if (name.Length > 100) errors["fullName"] = new[] { "Tối đa 100 ký tự" };

            var email = r.Email?.Trim();
            if (string.IsNullOrEmpty(email)) errors["email"] = new[] { JobRequestValidator.RequiredMessage };
            else if (!new EmailAddressAttribute().IsValid(email)) errors["email"] = new[] { "Email không đúng định dạng." };
            else if (email.Length > 255) errors["email"] = new[] { "Tối đa 255 ký tự" };

            if (r.CoverLetter?.Trim().Length > 500) errors["coverLetter"] = new[] { "Tối đa 500 ký tự" };

            var hasFile = r.CvFile is { Length: > 0 }; // 0 byte = không có file (M2)
            var cv = (hasFile, r.UseProfileCv) switch
            {
                (false, false) => "Vui lòng chọn CV.",
                (true, true) => JobRequestValidator.InvalidMessage,
                (false, true) => string.IsNullOrWhiteSpace(profileCv) ? "Hồ sơ của bạn chưa có CV." : null,
                _ => !CvExtensions.Contains(Path.GetExtension(r.CvFile!.FileName).ToLowerInvariant()) ? "CV phải là tệp PDF, DOC hoặc DOCX."
                    : r.CvFile.Length > MaxCvBytes ? "Tệp quá lớn. Dung lượng tối đa là 5MB." : null
            };
            if (cv != null) errors["cv"] = new[] { cv };
            return errors;
        }
    }
}
