using backend.DTO;
using backend.DTO.AuthDTO;
using backend.Models;
using backend.Repositories;

namespace backend.Services.auth
{
    public class LoginService
    {
        private UserRepository _repo;
        private IJwtTokenService _jwtTokenService;
        public LoginService(UserRepository _repo, IJwtTokenService _jwtTokenService)
        {
            this._repo = _repo;
            this._jwtTokenService = _jwtTokenService;
        }
        public async Task<LoginResDTO> LoginResult(LoginRequestDTO dto)
        {
            var user = await _repo.GetUserByEmail(dto.Email);
            if (user == null)
            {
                return null;
            }
            if (dto.Password == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return null;
            }

            var accessToken = _jwtTokenService.JwtToken(user: user, isAccessToken: true, expire: 15);
            var refreshToken = new RefreshToken
            {
                Token = _jwtTokenService.JwtToken(user: user, isAccessToken: false, expire: dto.rememberMe ? 60 * 24 * 30 : 15),
                UserId = user.UserId,
                ExpireAt = dto.rememberMe != false ? DateTime.UtcNow.AddDays(30) : DateTime.UtcNow.AddDays(1),
                IsRevoked = false,
            };

            return new LoginResDTO
            {
                UserId = user.UserId,
                Email = user.Email,
                accessToken = accessToken,
                refreshToken = refreshToken,
                Role = user.Role
            };
        }
    }
}
