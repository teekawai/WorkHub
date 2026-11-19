namespace backend.Constants
{
    /// <summary>
    /// Hình thức làm việc cố định của Job (Business 6.4.1). FE lấy qua GET /api/jobs/options.
    /// </summary>
    public static class JobWorkTypes
    {
        public const string Onsite = "Onsite";
        public const string Remote = "Remote";
        public const string Hybrid = "Hybrid";

        public static readonly IReadOnlyList<string> All = new[] { Onsite, Remote, Hybrid };

        public static bool IsValid(string? value) =>
            !string.IsNullOrEmpty(value) && All.Contains(value, StringComparer.Ordinal);
    }
}
