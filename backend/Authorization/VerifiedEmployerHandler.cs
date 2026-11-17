using System.Security.Claims;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace backend.Authorization
{
    /// <summary>
    /// Kiểm tra employer đang đăng nhập đã được verify (Employerprofile.IsVerified == true) chưa.
    /// Nếu chưa có profile hoặc IsVerified == false thì không pass requirement -> 403.
    /// </summary>
    public class VerifiedEmployerHandler : AuthorizationHandler<VerifiedEmployerRequirement>
    {
        private readonly WorkHubContext _context;

        public VerifiedEmployerHandler(WorkHubContext context)
        {
            _context = context;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            VerifiedEmployerRequirement requirement)
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }

            var isVerified = await _context.Employerprofiles
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .Select(e => (bool?)e.IsVerified)
                .FirstOrDefaultAsync();

            if (isVerified == true)
            {
                context.Succeed(requirement);
            }
        }
    }
}
