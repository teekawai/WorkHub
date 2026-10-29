using System.ComponentModel.DataAnnotations;

namespace backend.DTO.EmployerDTO
{
    public class EmployerProfileReq
    {
        [Required(ErrorMessage = "Không bỏ trống")]
        [MaxLength(100, ErrorMessage = "Tên công ty không được vượt quá 100 ký tự")]
        public string CompanyName { get; set; } = null!;

        [Required(ErrorMessage = "Không bỏ trống")]
        [MaxLength(255, ErrorMessage = "Địa chỉ không được vượt quá 255 ký tự")]
        public string Address { get; set; } = null!;

        public string? Description { get; set; }

        [MaxLength(255, ErrorMessage = "Website không được vượt quá 255 ký tự")]
        [RegularExpression(@"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$", ErrorMessage = "Website phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)")]
        public string? Website { get; set; }

        [Required(ErrorMessage = "Không bỏ trống")]
        [MaxLength(50, ErrorMessage = "Lĩnh vực không được vượt quá 50 ký tự")]
        public string Field { get; set; } = null!;

        [Range(1800, 2026, ErrorMessage = "Năm thành lập phải từ 1800 đến năm hiện tại")]
        public int? FoundedYear { get; set; }

        [Required(ErrorMessage = "Không bỏ trống")]
        [MaxLength(15, ErrorMessage = "Số điện thoại không được vượt quá 15 ký tự")]
        [RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại phải từ 10-11 chữ số và bắt đầu bằng số 0")]
        public string Phone { get; set; } = null!;

        [Required(ErrorMessage = "Không bỏ trống")]
        [MaxLength(15, ErrorMessage = "Mã số thuế không được vượt quá 15 ký tự")]
        [RegularExpression(@"^\d{10}(-\d{3}|\d{3})?$", ErrorMessage = "Mã số thuế phải gồm 10 chữ số hoặc 13 chữ số")]
        public string TaxCode { get; set; } = null!;

        //Cố ý KHÔNG có Logo và IsVerified: client không được tự gửi 2 field này lên (Postman cũng vậy).
        //Logo chỉ được set qua POST /me/logo, IsVerified chỉ đổi trực tiếp trong DB (hoặc luồng admin sau này).
    }
}
