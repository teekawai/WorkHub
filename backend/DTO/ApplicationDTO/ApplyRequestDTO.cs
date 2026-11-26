using Microsoft.AspNetCore.Http;

namespace backend.DTO.ApplicationDTO
{
    // Mọi field để nullable, không dùng data annotation: nếu không [ApiController] sẽ trả 400 trước khi Service kiểm hồ sơ (403 phải đứng trước 400, Business 2.2)
    public class ApplyRequestDTO
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? CoverLetter { get; set; }
        public bool UseProfileCv { get; set; }
        public IFormFile? CvFile { get; set; }
    }
}
