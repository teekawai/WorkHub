using System;
using System.Collections.Generic;

namespace WorkHub.API.Models;

public partial class Application
{
    public string ApplicationId { get; set; } = null!;

    public string FinderId { get; set; } = null!;

    public string JobId { get; set; } = null!;

    public string? Status { get; set; }

    public DateTime AppliedAt { get; set; }

    public string? CoverLetter { get; set; }

    public virtual FinderProfile Finder { get; set; } = null!;

    public virtual Job Job { get; set; } = null!;
}
