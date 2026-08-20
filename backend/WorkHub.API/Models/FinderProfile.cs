using System;
using System.Collections.Generic;

namespace WorkHub.API.Models;

public partial class FinderProfile
{
    public string UserId { get; set; } = null!;

    public string Fullname { get; set; } = null!;

    public string Email { get; set; } = null!;

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

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual User User { get; set; } = null!;
}
