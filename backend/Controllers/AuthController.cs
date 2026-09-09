using backend.DTO;
using backend.DTO.AuthDTO;
using backend.Models;
using backend.Repositories;
using backend.Services.auth;
using BCrypt.Net;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.UserSecrets;
using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.Tokens.Experimental;
using System.IdentityModel.Tokens.Jwt;
using System.Net.WebSockets;
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
        private UserRepository _userRepo;
        private LoginService _loginService;
        private INewRegisterService _registerService;

        public AuthController(WorkHubContext context, IConfiguration _configuration, 
            IJwtTokenService _jwtTokenService, UserRepository _repo, 
            LoginService _loginService, INewRegisterService _registerService)
        {
            this._workHubContext = context;
            this._configuration = _configuration;
            this._jwtTokenService = _jwtTokenService;
            this._userRepo = _repo;
            this._loginService = _loginService;
            this._registerService = _registerService;
        }

        [HttpPost("register")]
        [EnableRateLimiting("fixed")]

        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            var user = await _registerService.CreateUser(dto);

            return user.code switch
            {
                ErrorCode.Success => Ok(new {user.data.UserId, user.data.Email, user.data.Username, user.data.Role}),
                ErrorCode.NotFound => NotFound(new {message = user.message}),
                ErrorCode.Conflict => Conflict(new {message = user.message}),
                ErrorCode.BadRequest => BadRequest(new {message = user.message}),
            };
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleAuth([FromBody] GoogleLoginDTO dto, bool rememberMe)
        {
            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _configuration["Google_clientID"] }
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(dto.Token, settings);
            } catch
            {
                return Unauthorized("Google token không hợp lệ");
            }

            //Nốt việc validate, add user, save db
            var user = await _workHubContext.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
            if (user == null)
            {
                user = new User
                {
                    UserId = Guid.NewGuid().ToString(),
                    Username = payload.Email,
                    PasswordHash = null,
                    Role = dto.Role
                };
                _workHubContext.Add(user);
                await _workHubContext.SaveChangesAsync();
            }
            
                var accessToken = _jwtTokenService.JwtToken(user: user, isAccessToken: true, expire: 15);
                var refreshToken = new RefreshToken
                {
                    Token = _jwtTokenService.JwtToken(user: user, isAccessToken: false, expire: rememberMe ? 60 * 24 * 30 : 15),
                    UserId = user.UserId,
                    ExpireAt = rememberMe != false ? DateTime.UtcNow.AddDays(30) : DateTime.UtcNow.AddDays(1),
                    IsRevoked = false,
                };

                _workHubContext.RefreshTokens.Add(refreshToken);
                await _workHubContext.SaveChangesAsync();
                
                //cho refresh token trả về dưới dạng httponly cookie(nhằm tránh js đọc được, không bị kẻ khác tấn công)
                Response.Cookies.Append("refreshToken", refreshToken.Token, new CookieOptions
                {
                    HttpOnly = true, //chỉ http thôi, tránh js đọc được
                    Secure = true, // chỉ gửi qua giao thức https, không gửi qua http
                    SameSite = SameSiteMode.Strict, //cookie chỉ gửi request xuất phát từ cùng 1 site
                    Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : (DateTimeOffset?)null //nếu có rememberme thì lưu refresh token lại trong 30 ngày, không thì sẽ hết hiệu lực khi đóng browser
                });
            return Ok(new
            {
                accessToken = accessToken,
                UserId = user.UserId,
                Email = user.Email,
                Role = user.Role,
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequestDTO dto)
        {
            
            if (dto == null)
            {
                return BadRequest("Dữ liệu không hợp lệ");
            }

            var result =await _loginService.LoginResult(dto);
            //validate dữ liệu nhập
            if (result == null)
            {
                return Unauthorized("Tài khoản hoặc mật khẩu không đúng!");
            }
            var existRefreshToken = await _workHubContext.RefreshTokens.FirstOrDefaultAsync(token => token.UserId == result.UserId);
            if (existRefreshToken !=null) {
                result.refreshToken = existRefreshToken;
            }
            //nếu được thì add vào db
            _workHubContext.RefreshTokens.Add(result.refreshToken);
            await _workHubContext.SaveChangesAsync();

            //cho refresh token trả về dưới dạng httponly cookie(nhằm tránh js đọc được, không bị kẻ khác tấn công)
            Response.Cookies.Append("refreshToken", result.refreshToken.Token, new CookieOptions
            {
                HttpOnly = true, //chỉ http thôi, tránh js đọc được
                Secure = true, // chỉ gửi qua giao thức https, không gửi qua http
                SameSite = SameSiteMode.Strict, //cookie chỉ gửi request xuất phát từ cùng 1 site
                Expires = dto.rememberMe ? DateTime.UtcNow.AddDays(30) : (DateTimeOffset?)null //nếu có rememberme thì lưu refresh token lại trong 30 ngày, không thì sẽ hết hiệu lực khi đóng browser
            });
            //return dữ liệu vào local
            return Ok(new
            {
                accessToken = result.accessToken,
                UserId = result.UserId,
                Email = result.Email,
                Role = result.Role,
            });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];// lưu refresh ở cookies
                                                               //check xem có chưa
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized(new { message = "Chưa có refresh token!" });
            }
            var existToken = await _workHubContext.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
            if (existToken == null) {
                return Unauthorized("Không thấy refresh Token!");
            }
            if (existToken.IsRevoked)
            {
                return Unauthorized("Hết hạn!");
            }
            if (existToken.ExpireAt <= DateTime.UtcNow)
            {
                return Unauthorized("Hết hạn");
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
                return Unauthorized(new { message = "Refresh token không hợp lệ hoặc hết hạn do " + e.Message });
            }
            // nếu đoạn principle ok thì cấp lại accesstoken mới cho người dùng
            var userId = principle.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _workHubContext.Users.FindAsync(userId);
            if (user == null)
            {
                return BadRequest(new { message = "Không có người dùng này!" });
            }

            var accessToken = _jwtTokenService.JwtToken(user, true, 15);
            return Ok(new { accessToken = accessToken });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                var existToken = await _workHubContext.RefreshTokens
                    .FirstOrDefaultAsync(t => t.Token == refreshToken);

                if (existToken != null)
                {
                    existToken.IsRevoked = true;
                    await _workHubContext.SaveChangesAsync();
                }
            }
            Response.Cookies.Delete("refreshToken");
            
            return Ok("Đăng xuất thành công!");
        }
    }
}
