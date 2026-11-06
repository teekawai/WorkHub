using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class User
{
    public string UserId { get; set; } = null!;

    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;

    public string? PasswordHash { get; set; }

    // true khi đã chứng minh sở hữu email (hiện tại: đăng nhập qua Google). Tài khoản đăng ký bằng mật khẩu mặc định false
    public bool EmailVerified { get; set; } = false;

    public string Role { get; set; } = null!;

    public virtual Employerprofile? Employerprofile { get; set; }

    public virtual Finderprofile? Finderprofile { get; set; }
}
