using backend.DTO;
using backend.DTO.AuthDTO;
using backend.Models;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.auth
{
    public enum ErrorStatus { Unauthorized, Success }
    //để hiện kết quả trả về của quá trình login 
    public class ResultStatus
    {
        public ErrorStatus status { get; set; }
        public string message { get; set; } = null!;
        public LoginResDTO? data { get; set; }
    }
    public class LoginService
    {
        //inject các service
        private readonly UserRepository _repo;
        private readonly WorkHubContext _context;
        private readonly IJwtTokenService _jwtTokenService;
        public LoginService(UserRepository _repo, IJwtTokenService _jwtTokenService, WorkHubContext _context)
        {
            this._repo = _repo;
            this._jwtTokenService = _jwtTokenService;
            this._context = _context;
        }

        public async Task<ResultStatus> LoginResult(LoginRequestDTO dto)
        {
            var user = await _repo.GetUserByEmail(dto.Email);
            if (user == null)
            {
                return new ResultStatus
                {
                    status = ErrorStatus.Unauthorized,
                    message = "Sai tài khoản hoặc mật khẩu",
                };
            }
            if (dto.Password == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return new ResultStatus
                {
                    status = ErrorStatus.Unauthorized,
                    message = "Sai tài khoản hoặc mật khẩu",
                };
            }

            var (accessToken, refreshToken) = _jwtTokenService.NewToken(user, dto.rememberMe);

            // Upsert: tìm theo UserId (primary key của bảng refreshToken)
            // Nếu user đã login trước đó → update token cũ thay vì insert mới
            var existRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(r => r.UserId == user.UserId);

            if (existRefreshToken != null)
            {
                // Cập nhật token cũ
                existRefreshToken.Token = refreshToken.Token;
                existRefreshToken.ExpireAt = refreshToken.ExpireAt;
                existRefreshToken.IsRevoked = false;
            }
            else
            {
                // Lần đầu login → insert mới
                _context.RefreshTokens.Add(refreshToken);
            }

            await _context.SaveChangesAsync();

            var currentUser = new LoginResDTO
            {
                UserId = user.UserId,
                Email = user.Email,
                accessToken = accessToken,
                refreshToken = existRefreshToken ?? refreshToken,
                Role = user.Role
            };

            return new ResultStatus
            {
                status = ErrorStatus.Success,
                message = "Đăng nhập thành công",
                data = currentUser
            };
        }
    }
}
