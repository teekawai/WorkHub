using backend.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace backend.Middlewares;

// Bắt mọi lỗi bất ngờ: log đầy đủ, trả 500 INTERNAL_ERROR, không lộ stack trace
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Lỗi không xử lý được: {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);

        await ApiErrorWriter.WriteAsync(httpContext, StatusCodes.Status500InternalServerError,
            new ApiError(ApiErrorCodes.InternalError, "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
        return true;
    }
}
