using System;
using System.Collections.Generic;

namespace WorkHub.API.Models;

public partial class EmployerProfile
{
    public string UserId { get; set; } = null!;

    public string CompanyName { get; set; } = null!;

    public string? Logo { get; set; }

    public string Address { get; set; } = null!;

    public string? Description { get; set; }

    public string? Website { get; set; }

    public string Field { get; set; } = null!;

    public int? FoundedYear { get; set; }

    public string Email { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string TaxCode { get; set; } = null!;

    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    public virtual User User { get; set; } = null!;
}
