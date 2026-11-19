using Microsoft.AspNetCore.Mvc;

namespace backend.Common;
//helper giúp hiện kết quả ở 1 controller mới, thành công thì trả 200 kèm data, fail thì sẽ lấy theo lỗi của apiError, code sẽ lấy 
public static class ServiceResultExtensions
{
    // Chuyển ServiceResult thành IActionResult: thành công -> onSuccess/200, lỗi -> ApiError + status tương ứng
    public static IActionResult ToActionResult<T>(this ServiceResult<T> result, Func<T, IActionResult>? onSuccess = null)
    {
        if (result.IsSuccess)
        {
            return onSuccess != null ? onSuccess(result.Data!) : new OkObjectResult(result.Data);
        }

        var (status, defaultCode) = result.Code switch
        {
            ErrorCode.BadRequest => (StatusCodes.Status400BadRequest, ApiErrorCodes.ValidationError),
            ErrorCode.Unauthorized => (StatusCodes.Status401Unauthorized, ApiErrorCodes.Unauthenticated),
            ErrorCode.Forbidden => (StatusCodes.Status403Forbidden, ApiErrorCodes.Forbidden),
            ErrorCode.NotFound => (StatusCodes.Status404NotFound, ApiErrorCodes.NotFound),
            ErrorCode.Conflict => (StatusCodes.Status409Conflict, ApiErrorCodes.Conflict),
            ErrorCode.TooManyRequests => (StatusCodes.Status429TooManyRequests, ApiErrorCodes.TooManyRequests),
            ErrorCode.ServiceUnavailable => (StatusCodes.Status503ServiceUnavailable, ApiErrorCodes.ServiceUnavailable),
            // enum không map được là lỗi lập trình -> để global handler trả 500, không lộ message ra client
            _ => throw new InvalidOperationException($"ErrorCode chưa được map sang HTTP status: {result.Code}")
        };

        var code = string.IsNullOrEmpty(result.Key) ? defaultCode : result.Key;
        return new ObjectResult(new ApiError(code, result.Message ?? string.Empty, result.Errors))
        {
            StatusCode = status
        };
    }
}
