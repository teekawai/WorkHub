using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using backend.Common;
using backend.Services.idempotency;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using StackExchange.Redis;

namespace backend.Filters;

// Gắn lên action POST cần chống gửi trùng: client gửi header Idempotency-Key (UUID).
// Chạy sau authorization và sau model validation của [ApiController].
public class IdempotentAttribute : TypeFilterAttribute
{
    public IdempotentAttribute() : base(typeof(IdempotencyFilter)) { }
}

public class IdempotencyFilter : IAsyncActionFilter
{
    public const string HeaderName = "Idempotency-Key";
    // TTL ngắn khi đang xử lý để BE crash không khóa key lâu
    public static readonly TimeSpan ProcessingTtl = TimeSpan.FromSeconds(60);
    public static readonly TimeSpan CompletedTtl = TimeSpan.FromHours(12);
    private readonly IIdempotencyStore _store;
    private readonly JsonSerializerOptions _json;
    private readonly ILogger<IdempotencyFilter> _logger;

    // dùng đúng options của formatter JSON mà MVC ghi response (đã có encoder nới lỏng, camelCase...) để replay giống hệt byte
    public IdempotencyFilter(IIdempotencyStore store, IOptions<MvcOptions> mvcOptions, ILogger<IdempotencyFilter> logger)
    {
        _store = store;
        _json = mvcOptions.Value.OutputFormatters.OfType<SystemTextJsonOutputFormatter>().First().SerializerOptions;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var header = http.Request.Headers[HeaderName].ToString();
        if (!Guid.TryParse(header, out var keyGuid))
        {
            context.Result = Error(400, ApiErrorCodes.ValidationError, "Dữ liệu không hợp lệ",
                new Dictionary<string, string[]> { ["idempotencyKey"] = new[] { "Header Idempotency-Key là bắt buộc và phải là UUID hợp lệ" } });
            return;
        }

        var userId = http.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = Error(401, ApiErrorCodes.Unauthenticated, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn");
            return;
        }

        var path = http.Request.Path.Value?.ToLowerInvariant().TrimEnd('/');
        var key = $"idem:{userId}:{http.Request.Method}:{path}:{keyGuid:D}";

        // chỉ hash tham số [FromBody]; bỏ CancellationToken, IFormFile...
        // hash dùng serializer options của MVC: đổi cấu hình JSON khi key còn sống (12 tiếng) thì client gửi lại sẽ nhận IDEMPOTENCY_KEY_REUSED, chấp nhận được
        var body = context.ActionDescriptor.Parameters
            .Where(p => p.BindingInfo?.BindingSource == BindingSource.Body)
            .ToDictionary(p => p.Name, p => context.ActionArguments.TryGetValue(p.Name, out var value) ? value : null);
        var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(body, _json)));
        var token = Guid.NewGuid().ToString("N");

        try
        {
            if (!await _store.TryReserveAsync(key, new IdempotencyEntry(hash, token, false), ProcessingTtl))
            {
                context.Result = await ExistingResult(key, hash, http);
                return;
            }
        }
        catch (Exception ex) when (IsRedisError(ex))
        {
            context.Result = Unavailable(ex);
            return;
        }

        ActionExecutedContext executed;
        try
        {
            executed = await next();
        }
        catch
        {
            await TryDelete(key, token);
            throw;
        }

        // lỗi / exception / kết quả không phát lại được -> xóa key để client thử lại
        if (executed.Exception != null || executed.Result is not ObjectResult { StatusCode: >= 200 and < 300 } ok)
        {
            await TryDelete(key, token);
            return;
        }

        try
        {
            var location = (ok as CreatedResult)?.Location;
            await _store.SaveAsync(key, new IdempotencyEntry(hash, token, true, ok.StatusCode!.Value,
                JsonSerializer.Serialize(ok.Value, _json), location), CompletedTtl);
        }
        catch (Exception ex) when (IsRedisError(ex))
        {
            // action đã chạy xong; không lưu được thì chỉ mất khả năng replay, vẫn trả kết quả thật
            _logger.LogError(ex, "Redis error khi lưu idempotency response");
        }
    }

    // RedisTimeoutException kế thừa TimeoutException chứ không phải RedisException
    private static bool IsRedisError(Exception ex) => ex is RedisException or TimeoutException;

    private async Task<IActionResult> ExistingResult(string key, string hash, HttpContext http)
    {
        var entry = await _store.GetAsync(key);
        if (entry == null)
            return Error(409, ApiErrorCodes.RequestInProgress, "Yêu cầu đang được xử lý, vui lòng thử lại sau");
        // so hash trước: body khác thì báo dùng lại key kể cả khi request cũ còn đang chạy
        if (entry.BodyHash != hash)
            return Error(409, ApiErrorCodes.IdempotencyKeyReused, "Idempotency-Key đã được dùng cho nội dung yêu cầu khác");
        if (!entry.Completed)
            return Error(409, ApiErrorCodes.RequestInProgress, "Yêu cầu đang được xử lý, vui lòng thử lại sau");

        if (entry.Location != null) http.Response.Headers.Location = entry.Location;
        return new ContentResult { StatusCode = entry.Status, Content = entry.Body, ContentType = "application/json; charset=utf-8" };
    }

    private async Task TryDelete(string key, string token)
    {
        try { await _store.DeleteAsync(key, token); }
        catch (Exception ex) when (IsRedisError(ex)) { _logger.LogError(ex, "Redis error khi xóa idempotency key"); }
    }

    private IActionResult Unavailable(Exception ex)
    {
        _logger.LogError(ex, "Redis error trong idempotency filter");
        return Error(503, ApiErrorCodes.ServiceUnavailable, "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau");
    }

    private static ObjectResult Error(int status, string code, string message, IDictionary<string, string[]>? errors = null) =>
        new(new ApiError(code, message, errors)) { StatusCode = status };
}
