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

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
            // nếu user null thì đăng ký user đó
            if (user == null)
            {
                user = new User
                {
                    UserId = Guid.NewGuid().ToString(),
                    Username = payload.Email,
                    Email = payload.Email,
                    PasswordHash = null,
                    Role = dto.Role
                };
                _context.Add(user);
                await _context.SaveChangesAsync();
            }

            return ServiceResult<User>.Success(user, "Xác thực Google thành công");
        }
    }
}
