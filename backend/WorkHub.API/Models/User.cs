using System;
using System.Collections.Generic;

namespace WorkHub.API.Models;

public partial class User
{
    public string UserId { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public virtual EmployerProfile? EmployerProfile { get; set; }

    public virtual FinderProfile? FinderProfile { get; set; }
}
