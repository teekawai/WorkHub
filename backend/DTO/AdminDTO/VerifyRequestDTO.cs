namespace backend.DTO.AdminDTO
{
    // Tên công ty + MST admin đang xem; lệch với DB lúc verify -> 409 (không xác minh dữ liệu admin chưa xem)
    public class VerifyRequestDTO
    {
        public string? CompanyName { get; set; }
        public string? TaxCode { get; set; }
    }
}
