using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace backend.Common;

/// <summary>Slug công ty dạng A: /companies/&lt;tên&gt;/&lt;mã&gt; (Business 6.1).</summary>
public static class Slug
{
    private const string CodeChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static readonly Regex NonAlnum = new("[^a-z0-9]+", RegexOptions.Compiled);

    /// <summary>Phần tên trên URL: bỏ dấu, viết thường, cụm ký tự lạ thành 1 '-', bỏ '-' đầu/cuối. Không còn ký tự nào thì "cong-ty".</summary>
    public static string FromName(string name)
    {
        var sb = new StringBuilder();
        foreach (var c in name.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
        var slug = NonAlnum.Replace(sb.ToString().ToLowerInvariant(), "-").Trim('-');
        return slug.Length == 0 ? "cong-ty" : slug;
    }

    /// <summary>Mã 6 ký tự [a-z0-9] lưu ở employerprofile.slugCode, sinh một lần khi tạo hồ sơ.</summary>
    public static string NewCode() => RandomNumberGenerator.GetString(CodeChars, 6);
}
