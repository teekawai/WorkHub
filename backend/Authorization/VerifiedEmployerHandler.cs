using System.Security.Claims;
using backend.Common;
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
            // không phải employer thì bỏ qua (để RequireRole quyết định -> FORBIDDEN_ROLE), không gắn reason
            if (string.IsNullOrEmpty(userId) || !context.User.IsInRole("employer"))
            {
                return;
            }

            var isVerified = await _context.Employerprofiles
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .Select(e => (bool?)e.IsVerified)
                .FirstOrDefaultAsync();

            if (isVerified == null)
            {
                context.Fail(new AuthorizationFailureReason(this, ApiErrorCodes.EmployerProfileNotFound));
            }
            else if (isVerified == false)
            {
                context.Fail(new AuthorizationFailureReason(this, ApiErrorCodes.EmployerNotVerified));
            }
            else
            {
                context.Succeed(requirement);
            }
        }
    }
}
