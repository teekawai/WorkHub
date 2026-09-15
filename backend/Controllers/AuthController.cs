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
        private readonly IConfiguration _configuration;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly UserRepository _userRepo;
        private readonly LoginService _loginService;
        private readonly INewRegisterService _registerService;
        private readonly ITokenValidate _refTokenService;

        public AuthController(WorkHubContext context, IConfiguration _configuration, 
            IJwtTokenService _jwtTokenService, UserRepository _repo, 
            LoginService _loginService, INewRegisterService _registerService, ITokenValidate refTokenService)
        {
            this._workHubContext = context;
            this._configuration = _configuration;
            this._jwtTokenService = _jwtTokenService;
            this._userRepo = _repo;
            this._loginService = _loginService;
            this._registerService = _registerService;
            this._refTokenService = refTokenService;
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
                _ => StatusCode(500, new { message = "Lỗi không xác định" })
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

            var (accessToken, refreshToken) = _jwtTokenService.NewToken(user, rememberMe);

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
        [EnableRateLimiting("fixed")]
        public async Task<IActionResult> Login(LoginRequestDTO dto)
        {
            var result = await _loginService.LoginResult(dto);
            
            //check có dữ liệu user được trả về kh, kh thì lỗi, có thì lưu refreshToken vào cookies
            if(result.status != ErrorStatus.Success)
            {
                return result.status switch
                {
                    ErrorStatus.Unauthorized => Unauthorized(new { msg = result.message }),
                    _ => StatusCode(500, new { message = "Lỗi không xác định" })
                };
            }

            //cho refresh token trả về dưới dạng httponly cookie
            Response.Cookies.Append("refreshToken", result.data.refreshToken.Token, new CookieOptions
            {
                HttpOnly = true, //chỉ http thôi, tránh js đọc được
                Secure = true, // chỉ gửi qua giao thức https, không gửi qua http
                SameSite = SameSiteMode.Strict, //cookie chỉ gửi request xuất phát từ cùng 1 site
                Expires = dto.rememberMe ? DateTime.UtcNow.AddDays(30) : (DateTimeOffset?)null //nếu có rememberme thì lưu refresh token lại trong 30 ngày, không thì sẽ hết hiệu lực khi đóng browser
            });
            //return dữ liệu vào local
            return Ok (new { result.data.accessToken, result.data.Email, result.data.UserId, result.data.Role});
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            var principle = await _refTokenService.ValidateToken(refreshToken);
            // nếu đoạn principle ok thì cấp lại accesstoken mới cho người dùng
            var userId = principle.principle.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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
