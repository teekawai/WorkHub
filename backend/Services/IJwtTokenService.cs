using backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Services
{
    public interface IJwtTokenService
    {
        public string JwtToken(User user, bool isAccessToken, int expire);
    }

    public class JwtService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration _configuration)
        {
            this._configuration = _configuration;
        }

        public string JwtToken(User user, bool isAccessToken, int expire) 
        {
            //khai báo claim: Claims là các mẩu thông tin bạn muốn nhúng vào token, để sau này Middleware/Controller khác đọc ra mà không cần query lại DB.
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, user.UserId) };
            if(isAccessToken) claims.Add(new Claim(ClaimTypes.Role, user.Role)); // thêm cái claim role vào để sau này còn validate role
            
            //key( vẫn giống với lúc đăng kí dịch vụ jwt thôi), có key để bảo mật cc j cái jwt này á
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Key"] ?? throw new Exception("thiếu jwt key")));
            //chữ ký của jwt
            var credential = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            //sinh token
            var token = new JwtSecurityToken(
                claims: claims,
                issuer: _configuration["JWT:Issuer"],
                audience: _configuration["JWT:Audience"],
                expires: DateTime.UtcNow.AddMinutes(expire),
                signingCredentials: credential
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        
    }
}
