using backend.Common;
using backend.DTO;
using backend.Models;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.auth
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly WorkHubContext _context;
        private readonly IConfiguration _configuration;

        public GoogleAuthService(WorkHubContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<ServiceResult<User>> AuthenticateAsync(GoogleLoginDTO dto)
        {
            GoogleJsonWebSignature.Payload payload;

            // service của gg, validate token do FE gửi lên
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _configuration["Google_clientID"] }
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(dto.Token, settings);
            }
            catch
            {
                return ServiceResult<User>.Fail(ErrorCode.Unauthorized, "Google token không hợp lệ");
            }

            if (!payload.EmailVerified)
            {
                return ServiceResult<User>.Fail(ErrorCode.Unauthorized, "Email Google chưa được xác thực");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
            // nếu user null thì đăng ký user đó - chỉ cần validate role khi tạo user mới, user cũ không dùng dto.Role
            if (user == null)
            {
                if (dto.Role != "finder" && dto.Role != "employer")
                {
                    return ServiceResult<User>.Fail(ErrorCode.BadRequest, "Role không hợp lệ");
                }

                user = new User
                {
                    UserId = Guid.NewGuid().ToString(),
                    Username = payload.Email,
                    Email = payload.Email,
                    PasswordHash = null,
                    Role = dto.Role,
                    EmailVerified = true
                };
                _context.Add(user);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    // Tránh race condition: nếu một request khác đã tạo user này ngay trước đó
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
                    if (user == null)
                    {
                        return ServiceResult<User>.Fail(ErrorCode.Conflict, "Không thể xác thực Google lúc này, vui lòng thử lại.");
                    }
                }
            }
            // tài khoản đăng ký bằng mật khẩu nhưng chưa ai chứng minh sở hữu email -> có thể là người khác đăng ký giữ chỗ email này.
            // Google đã xác minh người đang đăng nhập là chủ email -> vô hiệu mật khẩu cũ để kẻ giữ chỗ không vào được nữa.
            // Phiên cũ tự mất vì AuthController.CreateJwtToken ghi đè refresh:{userId} trong Redis bằng token mới.
            else if (!user.EmailVerified)
            {
                user.PasswordHash = null;
                user.EmailVerified = true;

                // role cũ do người đăng ký trước chọn -> nếu chưa có hồ sơ nào thì cho chủ email chọn lại role
                var hasProfile = await _context.Employerprofiles.AnyAsync(e => e.UserId == user.UserId)
                                 || await _context.Finderprofiles.AnyAsync(f => f.UserId == user.UserId);
                if (!hasProfile && (dto.Role == "finder" || dto.Role == "employer"))
                {
                    user.Role = dto.Role;
                }

                await _context.SaveChangesAsync();
            }

            return ServiceResult<User>.Success(user, "Xác thực Google thành công");
        }
    }
}
