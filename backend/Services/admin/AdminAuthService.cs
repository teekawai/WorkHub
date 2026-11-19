using backend.Common;
using backend.DTO.AdminDTO;
using backend.Models;
using backend.Repositories;

namespace backend.Services.admin
{
    // Đăng nhập admin bằng email + khóa theo IP (PLAN_Admin 2). Không bao giờ log mật khẩu.
    public class AdminAuthService : IAdminAuthService
    {
        private const string BadCredentials = "Sai tài khoản hoặc mật khẩu";

        // Verify với hash giả khi không có admin để thời gian phản hồi không lộ email nào là admin
        private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("dummy-password-khong-dung", workFactor: 11);

        private readonly UserRepository _users;
        private readonly ILoginAttemptLimiter _limiter;
        private readonly ILogger<AdminAuthService> _logger;

        public AdminAuthService(UserRepository users, ILoginAttemptLimiter limiter, ILogger<AdminAuthService> logger)
        {
            _users = users;
            _limiter = limiter;
            _logger = logger;
        }

        public async Task<(ServiceResult<User> Result, TimeSpan? RetryAfter)> LoginAsync(AdminLoginDTO dto, string ip)
        {
            var gate = await _limiter.TryBeginAttemptAsync(ip);
            if (!gate.Allowed)
            {
                if (gate.JustLocked)
                    _logger.LogWarning("Khóa đăng nhập admin 30 phút: IP {Ip}", ip);
                _logger.LogWarning("Đăng nhập admin bị chặn do đang khóa: IP {Ip}, email {Email}", ip, dto.Email);
                var retry = gate.RetryAfter ?? TimeSpan.Zero;
                var minutes = Math.Max(1, (int)Math.Ceiling(retry.TotalMinutes));
                return (ServiceResult<User>.Fail(ErrorCode.TooManyRequests,
                    $"Đăng nhập sai quá nhiều lần, vui lòng thử lại sau {minutes} phút", ApiErrorCodes.TooManyRequests), retry);
            }

            var user = await _users.GetAdminByEmail(dto.Email);
            var valid = BCrypt.Net.BCrypt.Verify(dto.Password, user?.PasswordHash ?? DummyHash) && user?.PasswordHash != null;
            if (!valid)
            {
                // lượt đã được tính ở bước giữ lượt, không cần ghi thêm
                _logger.LogWarning("Đăng nhập admin thất bại: IP {Ip}, email {Email}", ip, dto.Email);
                return (ServiceResult<User>.Fail(ErrorCode.Unauthorized, BadCredentials), null);
            }

            await _limiter.ResetAsync(ip);
            _logger.LogInformation("Admin đăng nhập: IP {Ip}, email {Email}", ip, dto.Email);
            return (ServiceResult<User>.Success(user!, "Đăng nhập thành công"), null);
        }
    }
}
