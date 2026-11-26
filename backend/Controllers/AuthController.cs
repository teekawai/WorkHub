using backend.DTO;
using backend.DTO.AdminDTO;
using backend.Services.admin;
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
        private readonly ITokenValidate _refTokenService;//service validate các token
        private readonly IGoogleAuthService _googleAuthService;
        private readonly IDatabase _redis; //redis để lưu refresh token
        private readonly ILogger<AuthController> _logger;
        private readonly IAdminAuthService _adminAuthService;

        public AuthController(WorkHubContext context, IConfiguration _configuration,
            IJwtTokenService _jwtTokenService, UserRepository _repo,
            ILoginService _loginService, INewRegisterService _registerService,
            ITokenValidate refTokenService, IGoogleAuthService googleAuthService, IConnectionMultiplexer _redis,
            ILogger<AuthController> logger, IAdminAuthService adminAuthService)
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
            this._logger = logger;
            this._adminAuthService = adminAuthService;
        }

        [HttpPost("register")]

        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            var user = await _registerService.CreateUser(dto);
            return user.ToActionResult(u => Ok(new { u.UserId, u.Email, u.Username, u.Role }));
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

        //ảnh hiển thị trên NavBar: finder lấy avatar, employer lấy logo công ty (null nếu chưa có hồ sơ/ảnh)
        private async Task<string?> GetAvatar(User user)
        {
            return user.Role == "employer"
                ? await _workHubContext.Employerprofiles.Where(e => e.UserId == user.UserId).Select(e => e.Logo).FirstOrDefaultAsync()
                : await _workHubContext.Finderprofiles.Where(f => f.UserId == user.UserId).Select(f => f.Avatar).FirstOrDefaultAsync();
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleAuth([FromBody] GoogleLoginDTO dto)
        {
            var result = await _googleAuthService.AuthenticateAsync(dto);
            if (!result.IsSuccess) return result.ToActionResult();

            var user = result.Data!;
            var accessToken = await CreateJwtToken(dto.rememberMe, user);
            return Ok(new
            {
                accessToken = accessToken,
                UserId = user.UserId,
                Email = user.Email,
                Role = user.Role,
                Avatar = await GetAvatar(user),
            });
        }

        [HttpPost("login")]

        public async Task<IActionResult> Login(LoginRequestDTO dto)
        {
            var result = await _loginService.LoginResult(dto);

            //check có dữ liệu user được trả về kh, kh thì lỗi, có thì tạo token qua hàm chung
            if (!result.IsSuccess) return result.ToActionResult();

            var user = result.Data!;
            string accessToken;
            try
            {
                //hàm chung này tự tạo access + refresh token, lưu refresh vào redis, và set cookie refreshToken
                accessToken = await CreateJwtToken(dto.rememberMe, user);
            }
            catch (RedisException ex)   // RedisException bao luôn ConnectionException + Timeout
            {
                _logger.LogError(ex, "Redis error during login");
                return StatusCode(503, new ApiError(ApiErrorCodes.ServiceUnavailable, "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau"));
            }

            //return dữ liệu vào local cho phía fe
            return Ok(new { accessToken, user.Email, user.UserId, user.Role, Avatar = await GetAvatar(user) });
        }

        // Route đăng nhập cho admin
        [HttpPost("/api/admin/login")]
        public async Task<IActionResult> AdminLogin([FromBody] AdminLoginDTO dto)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            try
            {
                var (result, retryAfter) = await _adminAuthService.LoginAsync(dto, ip);
                if (!result.IsSuccess)
                {
                    if (retryAfter != null)
                        Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.Value.TotalSeconds)).ToString();
                    return result.ToActionResult();
                }

                var user = result.Data!;
                // admin luôn phiên ngắn, bỏ qua RememberMe client gửi (không cấp cookie refresh 30 ngày cho admin)
                var accessToken = await CreateJwtToken(false, user);
                return Ok(new { accessToken, user.Email, user.UserId, user.Role });
            }
            // RedisTimeoutException kế thừa TimeoutException chứ không phải RedisException
            catch (Exception ex) when (ex is RedisException or TimeoutException)
            {
                _logger.LogError(ex, "Redis error during admin login");
                return StatusCode(503, new ApiError(ApiErrorCodes.ServiceUnavailable, "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau"));
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            var principle = await _refTokenService.ValidateToken(refreshToken);
            if (!principle.IsSuccess) return principle.ToActionResult();
            // nếu đoạn principle ok thì cấp lại accesstoken mới cho người dùng
            var userId = principle.Data!.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _workHubContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
            // user đã bị xoá -> phiên không còn hợp lệ, FE interceptor sẽ đưa về trang login
            if (user == null)
            {
                return Unauthorized(new ApiError(ApiErrorCodes.Unauthenticated, "Không có người dùng này"));
            }

            var accessToken = _jwtTokenService.JwtToken(user, true, 15);
            return Ok(new { accessToken = accessToken });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Unauthorized(new ApiError(ApiErrorCodes.Unauthenticated, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn"));

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
                return Ok(new { message = "Đăng xuất thành công" });
            }
            catch (RedisException ex)
            {
                //ghi lỗi ở server, không trả chi tiết lỗi Redis về cho client
                _logger.LogError(ex, "Redis error during logout");
                return StatusCode(503, new ApiError(ApiErrorCodes.ServiceUnavailable, "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau"));
            }


        }
    }
}
