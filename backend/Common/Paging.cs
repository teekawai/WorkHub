namespace backend.Common;

// Logic phân trang dùng chung (Business 6.7): page/limit >= 1, limit tối đa 30 (tự hạ, không lỗi)
public static class Paging
{
    public const int MaxLimit = 30;
    private const string PositiveMessage = "Phải từ 1 trở lên";

    public static Dictionary<string, string[]> Validate(int page, int limit)
    {
        var errors = new Dictionary<string, string[]>();
        if (page < 1) errors["page"] = new[] { PositiveMessage };
        if (limit < 1) errors["limit"] = new[] { PositiveMessage };
        return errors;
    }

    public static int ClampLimit(int limit) => Math.Min(limit, MaxLimit);

    // limit đã qua Validate + ClampLimit (>= 1)
    public static Pagination Build(int totalItems, int page, int limit)
        => new(totalItems, (int)Math.Ceiling(totalItems / (double)limit), page, limit);
}
