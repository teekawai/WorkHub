using backend.Constants;

namespace backend.DTO.JobDTO
{
    // Danh sách lựa chọn cho form Job, trả qua GET /api/jobs/options (Business 6.4.1)
    public class JobOptionsDTO
    {
        public List<CategoryOptionDTO> Categories { get; set; } = new();
        public List<string> Locations { get; set; } = new();
        public List<string> WorkTypes { get; set; } = new();

        // giữ nguyên thứ tự khai báo trong Constants
        public static JobOptionsDTO FromConstants() => new()
        {
            Categories = JobCategories.Map.Select(kv => new CategoryOptionDTO { Name = kv.Key, SubCategories = kv.Value.ToList() }).ToList(),
            Locations = JobLocations.All.ToList(),
            WorkTypes = JobWorkTypes.All.ToList()
        };
    }

    public class CategoryOptionDTO
    {
        public string Name { get; set; } = null!;
        public List<string> SubCategories { get; set; } = new();
    }
}
