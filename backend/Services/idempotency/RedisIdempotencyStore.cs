using System.Text.Json;
using StackExchange.Redis;

namespace backend.Services.idempotency;

public class RedisIdempotencyStore : IIdempotencyStore
{
    // Lua chạy nguyên tử: chỉ thao tác khi Token trong JSON đang lưu trùng ARGV[1]
    private const string SaveScript = @"
local v = redis.call('GET', KEYS[1])
if v and cjson.decode(v).Token == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
  return 1
end
return 0";
    private const string DeleteScript = @"
local v = redis.call('GET', KEYS[1])
if v and cjson.decode(v).Token == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0";

    private readonly IDatabase _db;

    public RedisIdempotencyStore(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    public Task<bool> TryReserveAsync(string key, IdempotencyEntry pending, TimeSpan ttl) =>
        _db.StringSetAsync(key, JsonSerializer.Serialize(pending), ttl, When.NotExists);

    public async Task<IdempotencyEntry?> GetAsync(string key)
    {
        var value = await _db.StringGetAsync(key);
        return value.IsNullOrEmpty ? null : JsonSerializer.Deserialize<IdempotencyEntry>((string)value!);
    }

    public Task SaveAsync(string key, IdempotencyEntry entry, TimeSpan ttl) =>
        _db.ScriptEvaluateAsync(SaveScript, new RedisKey[] { key },
            new RedisValue[] { entry.Token, JsonSerializer.Serialize(entry), (long)ttl.TotalMilliseconds });

    public Task DeleteAsync(string key, string token) =>
        _db.ScriptEvaluateAsync(DeleteScript, new RedisKey[] { key }, new RedisValue[] { token });
}
