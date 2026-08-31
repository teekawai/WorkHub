using System.ComponentModel.DataAnnotations;

namespace backend.DTO
{
    public class LoginDTO
    {
        [Required(ErrorMessage = "Bạn chưa nhập mật khẩu!")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự!")]
        [MaxLength(50, ErrorMessage = "Mật khẩu không được vượt quá 50 ký tự")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Bạn chưa nhập mật khẩu!")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự!")]
        [MaxLength(50, ErrorMessage = "Mật khẩu không được vượt quá 50 ký tự")]

        public string Password { get; set; } = null!;

        public bool rememberMe { get; set; }

    }
}
