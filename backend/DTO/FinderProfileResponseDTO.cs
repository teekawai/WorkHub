using System.ComponentModel.DataAnnotations;

namespace backend.DTO
{
    public class FinderProfileResponseDTO
    {
        [Required(ErrorMessage ="Không bỏ trống!")]
        public string Fullname { get; set; } = null!;

        [Required(ErrorMessage = "Không bỏ trống!")]
        public string Phone { get; set; } = null!;

        public string? Avatar { get; set; }

        public string? Description { get; set; }

        public string? Address { get; set; }

        public string? EducationLevel { get; set; }

        public string? Experience { get; set; }

        public string? Cv { get; set; }

        public string? LinkedIn { get; set; }

        public string? Major { get; set; }

        public string? Skill { get; set; }
    }
}
