using System.ComponentModel.DataAnnotations;

namespace backend.DTO
{
    public class RegisterDTO
    {
        [Required(ErrorMessage = "Bạn chưa nhập họ tên của bạn!")]
        [MaxLength(50, ErrorMessage = "Tên không được vượt quá 50 ký tự")]
        public string Username { get; set; } = null!;
        
        [Required(ErrorMessage = "Bạn chưa nhập Email!")]
        [MaxLength(50, ErrorMessage = "Email không được vượt quá 50 ký tự")]

        [EmailAddress]
        public string Email { get; set; } = null!;
        
        [Required(ErrorMessage = "Bạn chưa nhập mật khẩu!")]
        [MinLength(6, ErrorMessage ="Mật khẩu phải có ít nhất 6 ký tự!")]
        [MaxLength(50, ErrorMessage = "Mật khẩu không được vượt quá 50 ký tự")]

        public string Password { get; set; } = null!;
        
        [Required(ErrorMessage = "Bạn chưa chọn role!")]
        public string Role { get; set; } = null!;
        
    }
}
