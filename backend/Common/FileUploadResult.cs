namespace backend.Common
{
    public class FileUploadResult
    {
        public bool IsSuccess { get; set; }
        public string? Url { get; set; }
        public string? ErrorMessage { get; set; }

        public static FileUploadResult Ok(string url) => new()
        {
            IsSuccess = true,
            Url = url
        };

        public static FileUploadResult Fail(string message) => new()
        {
            IsSuccess = false,
            ErrorMessage = message
        };
    }
}
