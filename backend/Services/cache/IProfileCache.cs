namespace backend.Services.cache;

// Cache-aside hồ sơ employer/finder (khóa profile:{role}:{userId}). Mọi lỗi Redis được nuốt + log Warning, caller luôn dùng DB làm gốc.
public interface IProfileCache
{
    Task<T?> GetAsync<T>(string role, string? userId) where T : class;
    Task SetAsync<T>(string role, string? userId, T value) where T : class;
    // Cố ý không nhận CancellationToken: gọi sau commit, client hủy request không được làm 500
    Task RemoveAsync(string role, string? userId);
}

public static class ProfileRoles
{
    public const string Employer = "employer";
    public const string Finder = "finder";
}
