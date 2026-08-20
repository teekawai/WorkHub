using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Job
{
    public string JobId { get; set; } = null!;

    public string EmployerId { get; set; } = null!;

    public string JobTitle { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Requirement { get; set; } = null!;

    public string ApplicantBenefit { get; set; } = null!;

    public DateTime Deadline { get; set; }

    public string WorkType { get; set; } = null!;

    public int NumberOfPosition { get; set; }

    public string Status { get; set; } = null!;

    public int? Salary { get; set; }

    public bool IsNegotiable { get; set; }

    public string Location { get; set; } = null!;

    public string? SkillRequired { get; set; }

    public DateTime CreateAt { get; set; }

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual EmployerProfile Employer { get; set; } = null!;
}
