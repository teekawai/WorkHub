using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class User
{
    public string UserId { get; set; } = null!;

    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public virtual Employerprofile? Employerprofile { get; set; }

    public virtual Finderprofile? Finderprofile { get; set; }
}
