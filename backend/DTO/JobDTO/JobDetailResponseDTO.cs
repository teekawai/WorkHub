using System.Text.Json.Serialization;

namespace backend.DTO.JobDTO
{
    // Chi tiết 1 Job: JobResponseDTO + thông tin công ty (Business 5.4). Không trả Phone/TaxCode/EmployerId.
    public class JobDetailResponseDTO : JobResponseDTO
    {
        public string CompanyAddress { get; set; } = null!;
        public int? CompanyFoundedYear { get; set; }
        public string? CompanyDescription { get; set; }

        // Finder đang đăng nhập đã nộp đơn cho Job này chưa; khách / role khác luôn false (Application Business 2.5).
        // Chỉ chi tiết công khai gán giá trị; chi tiết của Employer để null -> không có field trong JSON
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? HasApplied { get; set; }

        // job phải đã Include Employer
        public static JobDetailResponseDTO FromJobWithCompany(Models.Job job)
        {
            var dto = new JobDetailResponseDTO
            {
                CompanyAddress = job.Employer.Address,
                CompanyFoundedYear = job.Employer.FoundedYear,
                CompanyDescription = job.Employer.Description
            };
            CopyFrom(dto, job);
            return dto;
        }
    }
}
