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
}
