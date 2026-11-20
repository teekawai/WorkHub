using backend.Authorization;
using backend.Common;
using backend.Services.idempotency;
using backend.Middlewares;
using backend.Models;
using backend.Repositories;
using backend.Services.auth;
using backend.Services.files;
using backend.Services.admin;
using backend.Services.jobs;
using CloudinaryDotNet;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Serilog;
using Serilog.Events;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Log ra console + file theo ngày (backend/logs/workhub-<yyyyMMdd>.log, giữ 30 file). Câu SQL của EF (Information) vẫn được ghi.
builder.Host.UseSerilog((_, cfg) => cfg
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .WriteTo.Console()
    .WriteTo.File(Path.Combine(builder.Environment.ContentRootPath, "logs", "workhub-.log"),
        rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30, encoding: Encoding.UTF8));

// Add services to the container.

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    // lỗi binding/DTO -> 400 body chuẩn { code: VALIDATION_ERROR, message, errors } thay cho ProblemDetails
    options.InvalidModelStateResponseFactory = context =>
    {
        var modelState = context.ModelState;
        // key "$..." là lỗi parse JSON -> không trả message của parser ra client
        if (modelState.Keys.Any(k => k.StartsWith('$')))
        {
            return new BadRequestObjectResult(new ApiError(ApiErrorCodes.ValidationError, "Dữ liệu gửi lên không đúng định dạng JSON"));
        }

        var errors = modelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(
                e => JsonNamingPolicy.CamelCase.ConvertName(e.Key),
                e => e.Value!.Errors.Select(x => x.ErrorMessage).ToArray());
        return new BadRequestObjectResult(new ApiError(ApiErrorCodes.ValidationError, "Dữ liệu không hợp lệ", errors));
    };
});
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<WorkHubContext>(option => option.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddAuthentication(option =>
{
    option.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    option.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:Issuer"],
        ValidAudience = builder.Configuration["JWT:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JWT:Key"] ?? throw new Exception("thiếu jwt key")))
    };
    // refresh token ký cùng key/issuer/audience -> phải chặn bằng claim token_type, chỉ access token mới được dùng làm Bearer
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            if (context.Principal?.FindFirst(TokenTypes.ClaimName)?.Value != TokenTypes.Access)
            {
                context.Fail("Token không phải access token");
            }
            return Task.CompletedTask;
        },
        // thiếu/sai/hết hạn token -> 401 body chuẩn { code, message }
        OnChallenge = async context =>
        {
            context.HandleResponse();
            if (context.Response.HasStarted) return;
            await ApiErrorWriter.WriteAsync(context.HttpContext, StatusCodes.Status401Unauthorized,
                new ApiError(ApiErrorCodes.Unauthenticated, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn"));
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("VerifiedEmployer", policy =>
        policy.RequireAuthenticatedUser()
              .RequireRole("employer")
              .AddRequirements(new VerifiedEmployerRequirement()));
});

builder.Services.AddCors(option =>
{
    option.AddPolicy("CORS", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
        .WithExposedHeaders("Retry-After"); // FE đọc được thời gian khóa đăng nhập admin (429)
    });
});

var cloudName = builder.Configuration["Cloudinary:cloud_name"];
var apiKey = builder.Configuration["Cloudinary:api_key"];
var apiSecret = builder.Configuration["Cloudinary:api_secret"];
var redisConnectionString = builder.Configuration["Redis:ConnectionString"];

var cloudinaryAccount = new Account(cloudName, apiKey, apiSecret);
var cloudinary = new Cloudinary(cloudinaryAccount);
builder.Services.AddSingleton<ICloudinary>(cloudinary);
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<IJobRepository, JobRepository>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IIdempotencyStore, RedisIdempotencyStore>();
builder.Services.AddSingleton<backend.Services.cache.IProfileCache, backend.Services.cache.RedisProfileCache>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddHostedService<JobAutoCloseService>();
builder.Services.AddScoped<IJobSearchService, JobSearchService>();
builder.Services.AddScoped<IEmployerRepository, EmployerRepository>();
builder.Services.AddScoped<IAdminEmployerService, AdminEmployerService>();
builder.Services.AddSingleton<ILoginAttemptLimiter, RedisLoginAttemptLimiter>();
builder.Services.AddScoped<IAdminAuthService, AdminAuthService>();
builder.Services.AddScoped<ILoginService, LoginService>();
builder.Services.AddScoped<IJwtTokenService, JwtService>();
builder.Services.AddScoped<INewRegisterService, RegisterService>();
builder.Services.AddScoped<ITokenValidate, RefreshTokenValidate>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IAuthorizationHandler, VerifiedEmployerHandler>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ApiAuthorizationResultHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConnectionString)
);

// Cấu hình Rate Limiting phân vùng theo Client IP / User ID (tránh DoS chéo toàn cục)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // trả body chuẩn { code, message } + Retry-After để FE hiện đúng lý do thay vì lỗi chung
    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        }
        await ApiErrorWriter.WriteAsync(context.HttpContext, StatusCodes.Status429TooManyRequests,
            new ApiError(ApiErrorCodes.TooManyRequests, "Bạn thao tác quá nhanh, vui lòng thử lại sau"));
    };

    // Rate limit cho Auth (login/register): bảo vệ brute force nhưng đủ thoáng cho test tự động (100 req / phút theo IP)
    options.AddPolicy("auth", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    // Rate limit cho upload CV & Avatar: 30 request / phút theo User ID hoặc IP
    options.AddPolicy("upload_cv_avt", httpContext =>
    {
        var partitionKey = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? httpContext.Connection.RemoteIpAddress?.ToString()
                           ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    // Rate limit cho tìm kiếm Job công khai: 60 request / phút theo IP (Business 6.1)
    options.AddPolicy("job_search", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
});

var app = builder.Build();

// Seed admin: lỗi (vd MySQL tắt, race 2 instance chạm unique email) chỉ log, BE vẫn chạy
try
{
    using var seedScope = app.Services.CreateScope();
    var seedDb = seedScope.ServiceProvider.GetRequiredService<backend.Models.WorkHubContext>();
    var seedLogger = seedScope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminSeeder");
    await backend.Services.admin.AdminSeeder.SeedAsync(
        seedDb, app.Configuration["Admin:Email"], app.Configuration["Admin:Password"], seedLogger);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Seed tài khoản admin thất bại");
}

// Configure the HTTP request pipeline.
// bắt lỗi bất ngờ ở đầu pipeline -> trả 500 INTERNAL_ERROR
app.UseExceptionHandler(_ => { });

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

// thứ tự quan trọng:
// - CORS trước rate limiter -> response 429 vẫn có header CORS, trình duyệt không báo nhầm thành lỗi CORS
// - Authentication trước rate limiter -> policy "upload_cv_avt" đọc được UserId để chia giới hạn theo user thay vì theo IP
app.UseCors("CORS");

app.UseAuthentication();

app.UseRateLimiter();

app.UseAuthorization();

app.MapControllers();

app.Run();
