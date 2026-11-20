using backend.Common;
using backend.DTO.AdminDTO;
using backend.Models;

namespace backend.Services.admin
{
    public interface IAdminAuthService
    {
        // RetryAfter chỉ có giá trị khi bị khóa (TooManyRequests)
        Task<(ServiceResult<User> Result, TimeSpan? RetryAfter)> LoginAsync(AdminLoginDTO dto, string ip);
    }
}
