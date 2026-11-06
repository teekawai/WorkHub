using System;
using backend.Models;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Common;
namespace backend.Services.auth;


public class RefreshTokenValidate : ITokenValidate
{
    private readonly WorkHubContext _context;
    private readonly IConfiguration _configuration;
    private readonly StackExchange.Redis.IDatabase _redis;
    private readonly ILogger<RefreshTokenValidate> _logger;

    public RefreshTokenValidate(WorkHubContext context, IConfiguration configuration, IConnectionMultiplexer _redis, ILogger<RefreshTokenValidate> logger)
    {
        this._context = context;
        this._configuration = configuration;
        this._redis = _redis.GetDatabase();
        this._logger = logger;
    }

    public async Task<ServiceResult<ClaimsPrincipal>> ValidateToken(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            return ServiceResult<ClaimsPrincipal>.Fail(ErrorCode.Unauthorized, "Chưa có refresh token!");
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
            _logger.LogWarning(e, "Refresh token validation failed");
            return ServiceResult<ClaimsPrincipal>.Fail(ErrorCode.Unauthorized, "Refresh token không hợp lệ");
        }

        // chặn dùng access token để gọi /refresh
        if (principle.FindFirst(TokenTypes.ClaimName)?.Value != TokenTypes.Refresh)
        {
            return ServiceResult<ClaimsPrincipal>.Fail(ErrorCode.Unauthorized, "Refresh token không hợp lệ");
        }

        var userId = principle.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        RedisValue token;
        try
        {
            token = await _redis.StringGetAsync($"refresh:{userId}");
        }
        catch (Exception ex) when (ex is RedisException or RedisConnectionException or TimeoutException)
        {
            return ServiceResult<ClaimsPrincipal>.Fail(ErrorCode.ServiceUnavailable, "Dịch vụ xác thực tạm thời không khả dụng, vui lòng thử lại sau.");
        }

        //check xem có trong server redis không
        if (!token.HasValue || token != refreshToken)
        {
            return ServiceResult<ClaimsPrincipal>.Fail(ErrorCode.Unauthorized, "Token không hợp lệ");
        }
        return ServiceResult<ClaimsPrincipal>.Success(principle, "Tạo token mới thành công!");
    }
}
