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


    public virtual Finderprofile Finder { get; set; } = null!;

    public virtual Job Job { get; set; } = null!;
}
