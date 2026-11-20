namespace backend.DTO.AdminDTO
{
    public class AdminEmployerQueryDTO
    {
        public string? Keyword { get; set; }
        public bool? IsVerified { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 30;
    }
}
