using System;
using System.Collections.Generic;

namespace backend.Models;

public enum SalaryType
{
    Range = 1,
    Negotiable = 2
}

public class Salary
{
    public SalaryType SalaryType { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
}

public partial class Job
{
    public string JobId { get; set; } = null!;

    public string EmployerId { get; set; } = null!;

    public string JobTitle { get; set; } = null!;
    public string Category { get; set; } = null!;//Các ngành nghề(để dễ tìm kiếm)

    public string? SubCategory { get; set; } // Ngành nghề con, phụ thuộc Category

    public string Description { get; set; } = null!;

    public string Requirement { get; set; } = null!;
    public int YearOfExperience { get; set; } // số năm kinh nghiệm
    public string ApplicantBenefit { get; set; } = null!;

    public DateTime Deadline { get; set; }//thời gian hết job

    public string WorkType { get; set; } = null!;//hình thức làm việc: onboard/remote/hybrid

    public int NumberOfPosition { get; set; }// số người tuyển trên post này

    public string Status { get; set; } = null!;//trạng thái đang mở/đóng(hết thời gian hoặc đã đủ số lượng)

    public Salary Salary { get; set; } = new();

    public string Location { get; set; } = null!;

    public string? SkillRequired { get; set; } // Các skill(tag, phục vụ phần tìm kiếm)

    public DateTime CreatedAt { get; set; } //thời gian tạo job post này

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual Employerprofile Employer { get; set; } = null!;
}
