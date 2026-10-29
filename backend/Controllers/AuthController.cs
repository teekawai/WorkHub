using backend.DTO;
using backend.Models;
using backend.Repositories;
using backend.Services.auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using StackExchange.Redis;
using backend.Common;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.EntityFrameworkCore;


namespace backend.Controllers
{

    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("auth")]

    public class AuthController : ControllerBase
    {
        private readonly WorkHubContext _workHubContext;
        private readonly IConfiguration _configuration;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly UserRepository _userRepo;
        private readonly ILoginService _loginService;
        private readonly INewRegisterService _registerService;
        private readonly ITokenValidate _refTokenService;
        private readonly IGoogleAuthService _googleAuthService;
        private readonly IDatabase _redis;

        public AuthController(WorkHubContext context, IConfiguration _configuration,
            IJwtTokenService _jwtTokenService, UserRepository _repo,
            ILoginService _loginService, INewRegisterService _registerService,
            ITokenValidate refTokenService, IGoogleAuthService googleAuthService, IConnectionMultiplexer _redis)
        {
            this._workHubContext = context;
            this._configuration = _configuration;
            this._jwtTokenService = _jwtTokenService;
            this._userRepo = _repo;
            this._loginService = _loginService;
            this._registerService = _registerService;
            this._refTokenService = refTokenService;
            this._googleAuthService = googleAuthService;
            this._redis = _redis.GetDatabase();
        }

        [HttpPost("register")]

        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            var user = await _registerService.CreateUser(dto);

            return user.Code switch
            {
                ErrorCode.Success => Ok(new { user.Data!.UserId, user.Data.Email, user.Data.Username, user.Data.Role }),
                ErrorCode.NotFound => NotFound(new { message = user.Message }),
                ErrorCode.Conflict => Conflict(new { message = user.Message }),
                ErrorCode.BadRequest => BadRequest(new { message = user.Message }),
                _ => StatusCode(500, new { message = "Lỗi không xác định" })
            };
        }

        //tạo cả access và refresh token nhưng lưu refresh token vào cookie và redis, còn trả lại accessToken thôi
        private async Task<string> CreateJwtToken(bool rememberMe, User user)
        {
            var (accessToken, refreshToken) = _jwtTokenService.NewToken(user, rememberMe);
            var tokenLifeTime = rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromDays(7);
            await _redis.StringSetAsync($"refresh:{user.UserId}", refreshToken, tokenLifeTime);// lưu refresh token vào redis

            //cho refresh token trả về dưới dạng httponly cookie(nhằm tránh js đọc được, không bị kẻ khác tấn công)
            Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
            { 
                HttpOnly = true, //chỉ http thôi, tránh js đọc được
                Secure = true, // chỉ gửi qua giao thức https, không gửi qua http
                SameSite = SameSiteMode.Strict, //cookie chỉ gửi request xuất phát từ cùng 1 site
                Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : (DateTimeOffset?)null //nếu có rememberme thì lưu refresh token lại trong 30 ngày, không thì sẽ hết hiệu lực khi đóng browser
            });
            return accessToken;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleAuth([FromBody] GoogleLoginDTO dto)
        {
            var result = await _googleAuthService.AuthenticateAsync(dto);
            if (!result.IsSuccess)
            {
                return Unauthorized(new { message = result.Message });
            }

            var user = result.Data!;
            var accessToken = await CreateJwtToken(dto.rememberMe, user);
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
            var result = await _loginService.LoginResult(dto);

            //check có dữ liệu user được trả về kh, kh thì lỗi, có thì tạo token qua hàm chung
            if (!result.IsSuccess)
            {
                return result.Code switch
                {
                    ErrorCode.Unauthorized => Unauthorized(new { message = result.Message }),
                    ErrorCode.ServiceUnavailable => StatusCode(503, new { message = result.Message }),
                    _ => StatusCode(500, new { message = "Lỗi không xác định" })
                };
            }

            var user = result.Data!;
            string accessToken;
            try
            {
                //hàm chung này tự tạo access + refresh token, lưu refresh vào redis, và set cookie refreshToken
                accessToken = await CreateJwtToken(dto.rememberMe, user);
            }
            catch (RedisConnectionException ex)
            {
                return StatusCode(503, new { message = "The service is temporarily unavailable. Please try again later.(" + ex + ")" });
            }

            //return dữ liệu vào local cho phía fe
            return Ok(new { accessToken, user.Email, user.UserId, user.Role });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            var principle = await _refTokenService.ValidateToken(refreshToken);
            if (!principle.IsSuccess)
            {
                if (principle.Code == ErrorCode.ServiceUnavailable)
                {
                    return StatusCode(503, new { message = principle.Message });
                }
                return Unauthorized(new { message = principle.Message });
            }
            // nếu đoạn principle ok thì cấp lại accesstoken mới cho người dùng
            var userId = principle.Data!.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _workHubContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Unauthorized();

            try
            {
                await _redis.KeyDeleteAsync($"refresh:{userId}");
                //xóa cookie phải dùng cùng options với lúc tạo cookie
                Response.Cookies.Delete("refreshToken", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict
                });
                return Ok(new { message = "Logged out successfully." });
            }
            catch (RedisException ex)
            {
                //ghi lỗi ở server, không trả chi tiết lỗi Redis về cho client
                Console.Error.WriteLine($"Redis error during logout: {ex.Message}");
                return StatusCode(503, new { message = "The service is temporarily unavailable. Please try again later." });
            }


        }
    }
}
