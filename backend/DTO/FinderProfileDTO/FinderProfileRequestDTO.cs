using System.ComponentModel.DataAnnotations;

namespace backend.DTO.FinderProfileDTO
{
    public class FinderProfileRequestDTO
    {
        [Required(ErrorMessage = "Không bỏ trống!")]
        [MaxLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự!")]
        public string Fullname { get; set; } = null!;

        [Required(ErrorMessage = "Không bỏ trống!")]
        [MaxLength(15, ErrorMessage = "Số điện thoại không được vượt quá 15 ký tự!")]
        [RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0!")]
        public string Phone { get; set; } = null!;

        public string? Description { get; set; }

        [MaxLength(255, ErrorMessage = "Địa chỉ không được vượt quá 255 ký tự!")]
        public string? Address { get; set; }

        [MaxLength(30, ErrorMessage = "Trình độ học vấn không được vượt quá 30 ký tự!")]
        public string? EducationLevel { get; set; }

        public string? Experience { get; set; }

        [MaxLength(255, ErrorMessage = "LinkedIn không được vượt quá 255 ký tự!")]
        [RegularExpression(@"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$", ErrorMessage = "LinkedIn phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)!")]
        public string? LinkedIn { get; set; }

        [MaxLength(50, ErrorMessage = "Chuyên ngành không được vượt quá 50 ký tự!")]
        public string? Major { get; set; }

        public string? Skill { get; set; }
        public DateTime DateOfBirth {get; set;}
        public string? Gender{get; set;}

    }
}
