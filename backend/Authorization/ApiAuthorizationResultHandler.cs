using backend.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace backend.Authorization
{
    /// <summary>
    /// Trả body lỗi chuẩn { code, message } cho 403. Các trường hợp khác dùng handler mặc định
    /// (Challenged sẽ đi tới JwtBearerEvents.OnChallenge).
    /// </summary>
    public class ApiAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
    {
        private readonly AuthorizationMiddlewareResultHandler _default = new();

        public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
        {
            if (authorizeResult.Forbidden)
            {
                var reason = authorizeResult.AuthorizationFailure?.FailureReasons
                    .FirstOrDefault(r => r.Handler is VerifiedEmployerHandler);

                var code = reason?.Message switch
                {
                    ApiErrorCodes.EmployerProfileNotFound => ApiErrorCodes.EmployerProfileNotFound,
                    ApiErrorCodes.EmployerNotVerified => ApiErrorCodes.EmployerNotVerified,
                    _ => ApiErrorCodes.ForbiddenRole
                };

                var message = code switch
                {
                    ApiErrorCodes.EmployerProfileNotFound => "Bạn cần tạo hồ sơ công ty trước khi thực hiện thao tác này",
                    ApiErrorCodes.EmployerNotVerified => "Công ty của bạn chưa được xác minh",
                    _ => "Bạn không có quyền thực hiện thao tác này"
                };

                await ApiErrorWriter.WriteAsync(context, StatusCodes.Status403Forbidden, new ApiError(code, message));
                return;
            }

            await _default.HandleAsync(next, context, policy, authorizeResult);
        }
    }
}
