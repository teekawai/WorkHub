using System.Text.Json;
using StackExchange.Redis;

namespace backend.Services.cache;

public class RedisProfileCache : IProfileCache
{
    public static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);

    private readonly IDatabase _db;
    private readonly ILogger<RedisProfileCache> _logger;

    public RedisProfileCache(IConnectionMultiplexer redis, ILogger<RedisProfileCache> logger)
    {
        _db = redis.GetDatabase();
        _logger = logger;
    }

    // userId rỗng (claim thiếu) -> không đụng cache, tránh khóa "profile:employer:"
    private static string? Key(string role, string? userId) =>
        string.IsNullOrEmpty(userId) ? null : $"profile:{role}:{userId}";

    public async Task<T?> GetAsync<T>(string role, string? userId) where T : class
    {
        var key = Key(role, userId);
        if (key == null) return null;
        try
        {
            var value = await _db.StringGetAsync(key);
            return value.IsNullOrEmpty ? null : JsonSerializer.Deserialize<T>((string)value!);
        }
        catch (Exception ex) // Redis lỗi / JSON hỏng -> coi như miss
        {
            _logger.LogWarning(ex, "Đọc cache {Key} lỗi, dùng DB", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string role, string? userId, T value) where T : class
    {
        var key = Key(role, userId);
        if (key == null) return;
        try
        {
            // shortcut: race cache-aside có thể giữ bản cũ tới hết TTL 10 phút, đổi sang version key + Lua nếu cần nhất quán chặt
            await _db.StringSetAsync(key, JsonSerializer.Serialize(value), Ttl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ghi cache {Key} lỗi", key);
        }
    }

    public async Task RemoveAsync(string role, string? userId)
    {
        var key = Key(role, userId);
        if (key == null) return;
        try
        {
            await _db.KeyDeleteAsync(key);
        }
        catch (Exception ex) // khóa cũ sẽ tự hết hạn theo TTL
        {
            _logger.LogWarning(ex, "Xóa cache {Key} lỗi, dữ liệu cũ tối đa {Ttl}", key, Ttl);
        }
    }
}
