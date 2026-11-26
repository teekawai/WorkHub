namespace backend.Common
{
    public class FileUploadResult
    {
        public bool IsSuccess { get; set; }
        public string? Url { get; set; }
        public string? ErrorMessage { get; set; }
        // publicId thật Cloudinary trả về (đã gồm folder, raw có thể kèm đuôi): dùng để xóa file cho khớp
        public string? PublicId { get; set; }

        public static FileUploadResult Ok(string url, string? publicId = null) => new()
        {
            IsSuccess = true,
            Url = url,
            PublicId = publicId
        };

        public static FileUploadResult Fail(string message) => new()
        {
            IsSuccess = false,
            ErrorMessage = message
        };
    }
}
