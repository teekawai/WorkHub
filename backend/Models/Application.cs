using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Application
{
    public string ApplicationId { get; set; } = null!;

    public string FinderId { get; set; } = null!;

    public string JobId { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime AppliedAt { get; set; }

    public string? CoverLetter { get; set; }

    public virtual Finderprofile Finder { get; set; } = null!;

    public virtual Job Job { get; set; } = null!;
}
