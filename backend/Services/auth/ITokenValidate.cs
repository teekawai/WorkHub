using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Services.auth
{
    public interface ITokenValidate
    {
        public Task<RefTokenResult> ValidateToken(string token);
    }

    public enum StatusCode { Unauthorized, Success };
    public class RefTokenResult
    {
        public ClaimsPrincipal? principle;
        public StatusCode? code;
        public string message = null!;
    }

    public class RefreshTokenValidate : ITokenValidate
    {
        private readonly WorkHubContext _context;
        private readonly IConfiguration _configuration;
        private readonly StackExchange.Redis.IDatabase _redis;

        public RefreshTokenValidate(WorkHubContext context, IConfiguration configuration, IConnectionMultiplexer _redis)
        {
            this._context = context;
            this._configuration = configuration;
            this._redis = _redis.GetDatabase();
        }

        public async Task<RefTokenResult> ValidateToken(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken))
            {
                return (new RefTokenResult
                {
                    code = StatusCode.Unauthorized,
                    message = "Chưa có refresh token!"
                });
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Key"]!));
            // tạo đối tượng gom các claims đang có để sử dụng cho request lần này
            ClaimsPrincipal principle;
            try
            {
                //xác thực  refresh token đó, nếu có thì tạo cái claim principle, không thì sang catch
                principle = new JwtSecurityTokenHandler().ValidateToken(refreshToken, new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["JWT:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["JWT:Audience"],
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateLifetime = true

                }, out _);
            }
            catch (Exception e)
            {
                return (new RefTokenResult
                {
                    code = StatusCode.Unauthorized,
                    message = "RefreshToken không hợp lệ hoặc có lỗi trong quá trình xử lí: " + e.Message
                });
            }
            var userId = principle.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var token = await _redis.StringGetAsync($"refresh:{userId}");//thay thành getString từ redis
            //check xem có trong server redis không
            if (token.HasValue || token != refreshToken)
            {
                return (new RefTokenResult
                {
                    code = StatusCode.Unauthorized,
                    message = "Token không hợp lệ"
                });
            }
            return (new RefTokenResult
            {
                code = StatusCode.Success,
                message = "Tạo token mới thành công!",
                principle = principle
            });
        }
    }
}
