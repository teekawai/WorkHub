using System.ComponentModel.DataAnnotations;

namespace backend.DTO.EmployerDTO
{
    public class EmployerProfileResDTO
    {
        [Required(ErrorMessage = "Không bỏ trống")]
        public string CompanyName { get; set; } = null!;

        public string? Logo { get; set; }

        [Required(ErrorMessage = "Không bỏ trống")]
        public string Address { get; set; } = null!;

        public string? Description { get; set; }

        public string? Website { get; set; }
        [Required(ErrorMessage = "Không bỏ trống")]
        public string Field { get; set; } = null!;

        public int? FoundedYear { get; set; }
        [Required(ErrorMessage = "Không bỏ trống")]
        public string Phone { get; set; } = null!;
        [Required(ErrorMessage = "Không bỏ trống")]
        public string TaxCode { get; set; } = null!;
        [Required(ErrorMessage = "Không bỏ trống")]
        public string Email { get; set; } = null!;
        public bool IsVerified {get; set;}
    }
}
