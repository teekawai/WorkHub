using Microsoft.AspNetCore.Authorization;

namespace backend.Authorization
{
    /// <summary>
    /// Requirement rỗng, chỉ dùng để đánh dấu policy "VerifiedEmployer".
    /// Gắn [Authorize(Policy = "VerifiedEmployer")] vào các action employer
    /// không được dùng khi chưa verify (POST/PUT/PATCH/DELETE job, quản lý ứng viên).
    /// </summary>
    public class VerifiedEmployerRequirement : IAuthorizationRequirement
    {
    }
}
