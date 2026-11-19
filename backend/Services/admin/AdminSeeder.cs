using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.admin
{
    public enum AdminSeedResult { Created, AlreadyExists, MissingConfig, EmailTaken, PasswordTooShort }

    // Seed tài khoản admin lúc BE khởi động. Không bao giờ log mật khẩu.
    public static class AdminSeeder
    {
        public const string Role = "admin";
        private const int MinPasswordLength = 8;

        public static async Task<AdminSeedResult> SeedAsync(WorkHubContext db, string? email, string? password, ILogger logger)
        {
            email = email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning("Thiếu cấu hình Admin:Email / Admin:Password");
                return AdminSeedResult.MissingConfig;
            }
            if (password.Length < MinPasswordLength)
            {
                logger.LogWarning("Admin:Password ngắn hơn {Min} ký tự", MinPasswordLength);
                return AdminSeedResult.PasswordTooShort;
            }

            // email unique: đã là admin -> thôi; là user thường -> không nâng quyền (tránh ai đăng ký trước bằng email admin rồi chiếm quyền)
            var existingRole = await db.Users.Where(u => u.Email == email).Select(u => u.Role).FirstOrDefaultAsync();
            if (existingRole == Role) return AdminSeedResult.AlreadyExists;
            if (existingRole != null)
            {
                logger.LogError("Email admin '{Email}' đã được tài khoản {Role} dùng, không tạo admin", email, existingRole);
                return AdminSeedResult.EmailTaken;
            }

            db.Users.Add(new User
            {
                UserId = Guid.NewGuid().ToString(),
                Username = Role,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11),
                Role = Role,
                EmailVerified = false
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Đã tạo tài khoản admin '{Email}'", email);
            return AdminSeedResult.Created;
        }
    }
}
