namespace backend.DTO.JobDTO
{
    // Body PATCH /api/jobs/:id/status — chỉ nhận "Closed" (Business 2.4)
    public class JobStatusDTO
    {
        public string? Status { get; set; }
    }
}
