namespace backend.Constants
{
    /// <summary>
    /// Trạng thái Job: chỉ Open / Closed, chuyển một chiều Open → Closed (Business 2.1, 2.4).
    /// </summary>
    public static class JobStatuses
    {
        public const string Open = "Open";
        public const string Closed = "Closed";
    }

    // giá trị query ?status= của "Tin tuyển dụng của tôi" (Business 5.1); khác với giá trị lưu DB ở trên
    public static class OwnerJobStatus
    {
        public const string Open = "open";
        public const string Closed = "closed";
        public const string Expired = "expired";
        public static bool IsValid(string status) => status is Open or Closed or Expired;
    }
}
