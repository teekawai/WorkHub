using backend.DTO;
using backend.Models;
using backend.Services;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.UserSecrets;
using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.Tokens.Experimental;
using System.IdentityModel.Tokens.Jwt;
using System.Runtime.Intrinsics.Arm;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace backend.Controllers
{
    
    [ApiController]
    [Route("api/auth")]
    
    public class AuthController : ControllerBase
    {
        private readonly WorkHubContext _workHubContext;
        private IConfiguration _configuration;
        private IJwtTokenService _jwtTokenService;

        public AuthController(WorkHubContext context, IConfiguration _configuration, IJwtTokenService _jwtTokenService)
        {
            this._workHubContext = context;
            this._configuration = _configuration;
            this._jwtTokenService = _jwtTokenService;
        }

        [HttpPost("register")]

        public async Task<IActionResult> Register(RegisterDTO dto) {
            //validate dữ liệu
            if (dto == null) {
                return BadRequest(new{message ="Bạn chưa điền đầy đủ thông tin!"});
            }

            if(string.IsNullOrEmpty( dto.Username)||
            string.IsNullOrEmpty( dto.Password) || 
            string.IsNullOrEmpty( dto.Email))
            {
                return BadRequest(new{ message="Bạn chưa điền đầy đủ thông tin!"});
            }

            var existEmail = await _workHubContext.Users.AnyAsync(user => user.Email ==dto.Email);
            if (existEmail) 
            {
                return Conflict(new{message = "Email đã được đăng ký!"});
            }

            if(dto.Role !="finder" && dto.Role != "employer")
            {
                return BadRequest(new{ message = "Chọn đúng role(người tìm việc hay người tuyển dụng)!"});
            }

            if(dto.Password.Length < 6)
            {
                return BadRequest(new{message = "Mật khẩu cần nhập từ 6 ký tự trở lên!"});
            }

            //hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            //tạo user mới với thông mật khẩu bảo mật
            var newUser = new User
            {
                UserId = Guid.NewGuid().ToString(),
                Username = dto.Username,
                Email = dto.Email.Trim().ToLower(),
                PasswordHash = passwordHash,
                Role = dto.Role,
            };
            //thêm và lưu user vào database
            _workHubContext.Users.Add(newUser);
            await _workHubContext.SaveChangesAsync();

            return Ok(new {newUser.Username, newUser.UserId, newUser.Email, newUser.Role});
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            if (dto == null) { 
                return BadRequest("Dữ liệu không hợp lệ");
            }

            var user = await _workHubContext.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if(user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Tài khoản hoặc mật khẩu của bạn không đúng, xin vui lòng thử lại!" });
            }
            
            //Tạo access token và refresh token
            var accessToken = _jwtTokenService.JwtToken(user: user, isAccessToken: true, expire: 15);
            var refreshToken = _jwtTokenService.JwtToken(user: user, isAccessToken: false, expire: dto.rememberMe ? 60*24*30 : 60 * 24 * 7);//có remember me thì thời gian hết hạn là 30 ngày, không thì là 7 ngày

            //cho refresh token trả về dưới dạng httponly cookie(nhằm tránh js đọc được, không bị kẻ khác tấn công)
            Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
            {
                HttpOnly = true, //chỉ http thôi, tránh js đọc được
                Secure = true, // chỉ gửi qua giao thức https, không gửi qua http
                SameSite = SameSiteMode.Strict, //cookie chỉ gửi request xuất phát từ cùng 1 site
                Expires = dto.rememberMe ? DateTime.UtcNow.AddDays(30) : (DateTimeOffset?)null //nếu có rememberme thì lưu refresh token lại trong 30 ngày, không thì sẽ hết hiệu lực khi đóng browser
            });
            //return dữ liệu vào local
            return Ok(new { accessToken = accessToken, userId = user.UserId, username = user.Username, role = user.Role });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken() {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized( new { message = "Chưa có refresh token!" } );
            }
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Key"]!));
            ClaimsPrincipal principle;
            try
            {
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
            } catch(Exception e)
            {
                return Unauthorized(new{ message = "Refresh token không hợp lệ hoặc hết hạn do " +e.Message});
            }

            var userId = principle.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _workHubContext.Users.FindAsync(userId);
            if(user == null)
            {
                return BadRequest(new{message = "Không có người dùng này!"});
            }

            var accessToken = _jwtTokenService.JwtToken(user, true, 15);
            return Ok(new {accessToken = accessToken});
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("refreshToken");
            return Ok("Đăng xuất thành công!");
        }
    }
}
