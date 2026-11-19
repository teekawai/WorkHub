using System.Text.Json;

namespace backend.Common;

// Ghi ApiError thẳng ra response (dùng cho exception handler, JWT challenge, authorization handler)
public static class ApiErrorWriter
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static async Task WriteAsync(HttpContext ctx, int status, ApiError error)
    {
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        await JsonSerializer.SerializeAsync(ctx.Response.Body, error, Options, ctx.RequestAborted);
    }
}
