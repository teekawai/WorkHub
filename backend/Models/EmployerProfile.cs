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
    public bool IsVerified {get; set;}= false; //xác minh doanh nghiệp

    // Lý do admin thu hồi xác minh (null khi chưa bị hủy)
    public string? UnverifyReason { get; set; }

    // Mã 6 ký tựtrong URL công ty, tránh trường hợp dường dẫn của 2 công ty có tên giống nhau chỉ khác dấu bị trình nhau
    public string SlugCode { get; set; } = null!;

    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    public virtual User User { get; set; } = null!;
}
