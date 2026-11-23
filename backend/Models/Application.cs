using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Application
{
    public string ApplicationId { get; set; } = null!;

    public string FinderId { get; set; } = null!;

    public string JobId { get; set; } = null!;

    public string Status { get; set; } = null!;//trạng thái chờ/từ chối/tuyển

    public DateTime AppliedAt { get; set; }// thời gian nộp đơn ứng tuyển

    public string? CoverLetter { get; set; } //coverletter

    // Snapshot thông tin nộp đơn (Business 1.1)
    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string CvUrl { get; set; } = null!;

    // Lý do từ chối (khi Status = Rejected)
    public string? RejectReason { get; set; }

    // Thời điểm đổi trạng thái gần nhất, UTC
    public DateTime? StatusChangedAt { get; set; }


    public virtual Finderprofile Finder { get; set; } = null!;

    public virtual Job Job { get; set; } = null!;
}
