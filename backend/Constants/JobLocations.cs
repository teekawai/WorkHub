namespace backend.Constants
{
    /// <summary>
    /// 34 tỉnh/thành cố định cho Job.Location (Business 6.4.1). FE lấy qua GET /api/jobs/options.
    /// </summary>
    public static class JobLocations
    {
        public static readonly IReadOnlyList<string> All = new[]
        {
            "Hà Nội", "Hải Phòng", "Huế", "Đà Nẵng", "Hồ Chí Minh", "Cần Thơ",
            "Cao Bằng", "Điện Biên", "Lai Châu", "Lạng Sơn", "Sơn La", "Quảng Ninh",
            "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Tuyên Quang", "Lào Cai", "Thái Nguyên",
            "Phú Thọ", "Bắc Ninh", "Hưng Yên", "Ninh Bình", "Quảng Trị", "Quảng Ngãi",
            "Gia Lai", "Đắk Lắk", "Khánh Hòa", "Lâm Đồng", "Đồng Nai", "Tây Ninh",
            "Vĩnh Long", "Đồng Tháp", "An Giang", "Cà Mau"
        };

        public static bool IsValid(string? value) =>
            !string.IsNullOrEmpty(value) && All.Contains(value, StringComparer.Ordinal);
    }
}
