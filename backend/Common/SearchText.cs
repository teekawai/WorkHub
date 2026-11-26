namespace backend.Common;

// Chuẩn hóa keyword tìm kiếm dùng chung (Business 6.3)
public static class SearchText
{
    public const int MaxKeywordLength = 255;
    public static readonly string KeywordTooLongMessage = $"Tối đa {MaxKeywordLength} ký tự";

    // collation utf8mb4_unicode_ci bỏ qua hoa thường / dấu nhưng 'đ' khác 'd' -> thay đ/Đ thành d (phía cột viết Replace trong LINQ)
    public static string Normalize(string keyword) => keyword.Replace('đ', 'd').Replace('Đ', 'd');
}
