using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.admin
{
    public enum AdminSeedResult { Created, AlreadyExists, MissingConfig, EmailTaken, PasswordTooShort }

    // Seed tài khoản admin lúc BE khởi động. 
    public static class AdminSeeder
    {
        public const string Role = "admin";
       

        public static async Task<AdminSeedResult> SeedAsync(WorkHubContext db, string? email, string? password, ILogger logger)
        {
            email = email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning("Chưa cấu hình tài khoản admin");
                return AdminSeedResult.MissingConfig;
            }
            if (password.Length < 8)
            {
                logger.LogWarning("Admin:Password ngắn hơn 8 ký tự");
                return AdminSeedResult.PasswordTooShort;
            }

            // email unique: đã là admin thì thôi, còn nếu là user thường thì không nâng quyền
            var existingRole = await db.Users.Where(u => u.Email == email).Select(u => u.Role).FirstOrDefaultAsync();
            if (existingRole == Role) return AdminSeedResult.AlreadyExists;
            if (existingRole != null)
            {
                logger.LogError("Email này đã được đăng ký với vai trò khác");
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
            logger.LogInformation("Đã tạo tài khoản admin");
            return AdminSeedResult.Created;
        }
    }
}
