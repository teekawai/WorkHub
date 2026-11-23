using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Employerprofile
{
    public string UserId { get; set; } = null!;

    public string CompanyName { get; set; } = null!;

    public string? Logo { get; set; }

    public string Address { get; set; } = null!;

    public string? Description { get; set; }

    public string? Website { get; set; }

    public string Field { get; set; } = null!;

    public int? FoundedYear { get; set; }

    public string Phone { get; set; } = null!;

    
    public string TaxCode { get; set; } = null!;
    public bool IsVerified {get; set;}= false;

    // Lý do admin thu hồi xác minh (null khi chưa bị hủy)
    public string? UnverifyReason { get; set; }

    // Mã 6 ký tự [a-z0-9] trong URL công ty, sinh khi tạo hồ sơ, không đổi (Business 6.1)
    public string SlugCode { get; set; } = null!;

    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    public virtual User User { get; set; } = null!;
}
