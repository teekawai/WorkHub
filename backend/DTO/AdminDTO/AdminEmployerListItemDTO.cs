using backend.Repositories;

namespace backend.DTO.AdminDTO
{
    // 1 công ty trong GET /api/admin/employers; đúng các field PLAN_Admin 3.2, không lộ PasswordHash/Role/Username
    public class AdminEmployerListItemDTO
    {
        public string UserId { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string? Logo { get; set; }
        public string Email { get; set; } = null!;
        public bool EmailVerified { get; set; }
        public string Phone { get; set; } = null!;
        public string TaxCode { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? Website { get; set; }
        public string Field { get; set; } = null!;
        public int? FoundedYear { get; set; }
        public bool IsVerified { get; set; }
        public int OpenJobCount { get; set; }

        public static AdminEmployerListItemDTO FromRow(AdminEmployerRow row) => new()
        {
            UserId = row.Profile.UserId,
            CompanyName = row.Profile.CompanyName,
            Logo = row.Profile.Logo,
            Email = row.Email,
            EmailVerified = row.EmailVerified,
            Phone = row.Profile.Phone,
            TaxCode = row.Profile.TaxCode,
            Address = row.Profile.Address,
            Website = row.Profile.Website,
            Field = row.Profile.Field,
            FoundedYear = row.Profile.FoundedYear,
            IsVerified = row.Profile.IsVerified,
            OpenJobCount = row.OpenJobCount
        };
    }
}
