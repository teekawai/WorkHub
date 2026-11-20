namespace backend.Common;

// Helper thời gian theo lịch Việt Nam. DB lưu UTC; Deadline là DateOnly theo lịch VN (Business 1.6)
public static class VnTime
{
    // Máy không có ICU/tzdata thì FindSystemTimeZoneById sẽ ném lỗi -> dùng TryFind + fallback UTC+7.
    // VN không có DST nên fallback cố định +7 luôn đúng.
    public static readonly TimeZoneInfo Zone =
        TimeZoneInfo.TryFindSystemTimeZoneById("Asia/Ho_Chi_Minh", out var tz)
            ? tz
            : TimeZoneInfo.CreateCustomTimeZone("Asia/Ho_Chi_Minh", TimeSpan.FromHours(7), "Giờ Việt Nam", "Giờ Việt Nam");

    public static DateOnly Today() => Today(DateTime.UtcNow);

    public static DateOnly Today(DateTime utcNow) => DateOnly.FromDateTime(ToVn(utcNow));

    public static DateTime ToVn(DateTime utc)
    {
        // Unspecified (EF đọc từ MySQL) coi là UTC; Local đổi về UTC trước
        var utcValue = utc.Kind == DateTimeKind.Local
            ? utc.ToUniversalTime()
            : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        var vn = TimeZoneInfo.ConvertTimeFromUtc(utcValue, Zone);
        return DateTime.SpecifyKind(vn, DateTimeKind.Unspecified);
    }
}
