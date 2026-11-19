using StackExchange.Redis;

namespace backend.Services.admin
{
    public class RedisLoginAttemptLimiter : ILoginAttemptLimiter
    {
        public const int MaxFailures = 5;
        public static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(30);

        // Nguyên tử: đang khóa -> trả PTTL; không thì INCR đếm lượt (TTL đặt ở lần đầu),
        // vượt MaxFailures -> SET lock + DEL bộ đếm. Trả {allowed, retryAfterMs, justLocked}
        private const string BeginScript = @"
local ttl = redis.call('PTTL', KEYS[1])
if ttl > 0 then return {0, ttl, 0} end
local c = redis.call('INCR', KEYS[2])
if c == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[2]) end
if c > tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], '1', 'PX', ARGV[2])
  redis.call('DEL', KEYS[2])
  return {0, tonumber(ARGV[2]), 1}
end
return {1, 0, 0}";

        private readonly IDatabase _db;

        public RedisLoginAttemptLimiter(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

        public async Task<LoginAttemptGate> TryBeginAttemptAsync(string ip)
        {
            var r = (long[])(await _db.ScriptEvaluateAsync(BeginScript,
                new RedisKey[] { $"admin-login:lock:{ip}", $"admin-login:fail:{ip}" },
                new RedisValue[] { MaxFailures, (long)LockDuration.TotalMilliseconds }))!;
            return r[0] == 1
                ? new LoginAttemptGate(true, null, false)
                : new LoginAttemptGate(false, TimeSpan.FromMilliseconds(r[1]), r[2] == 1);
        }

        public Task ResetAsync(string ip) => _db.KeyDeleteAsync($"admin-login:fail:{ip}");
    }
}
