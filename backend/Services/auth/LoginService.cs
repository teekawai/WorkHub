using backend.DTO;
using backend.DTO.AuthDTO;
using backend.Models;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace backend.Services.auth
{
    public enum ErrorStatus { Unauthorized, RedisServerDown, Success }
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
        private readonly IDatabase _redis;
        public LoginService(UserRepository _repo, IJwtTokenService _jwtTokenService, WorkHubContext _context, IConnectionMultiplexer _redis)
        {
            this._repo = _repo;
            this._jwtTokenService = _jwtTokenService;
            this._context = _context;
            this._redis = _redis.GetDatabase();
        }

        public async Task<ResultStatus> LoginResult(LoginRequestDTO dto)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var user = await _repo.GetUserByEmail(dto.Email);
            Console.WriteLine($"GetUser: {sw.ElapsedMilliseconds}ms");

            // check password...
            Console.WriteLine($"BCrypt: {sw.ElapsedMilliseconds}ms");
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
            try
            {
                var ttl = dto.rememberMe ? TimeSpan.FromDays(15) : TimeSpan.FromMinutes(15);
                await _redis.StringSetAsync($"refresh:{user.UserId}", refreshToken, ttl);
                Console.WriteLine($"NewToken: {sw.ElapsedMilliseconds}ms");
                Console.WriteLine($"Redis SET: {sw.ElapsedMilliseconds}ms");
                var currentUser = new LoginResDTO
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                    Role = user.Role
                };

                return new ResultStatus
                {
                    status = ErrorStatus.Success,
                    message = "Đăng nhập thành công",
                    data = currentUser
                };
            } catch (RedisConnectionException ex)
            {
                return new ResultStatus
                {
                    status = ErrorStatus.RedisServerDown,
                    message = ex.Message
                };
            }
            
        }
    }
}
