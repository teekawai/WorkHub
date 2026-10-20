using backend.Common;
using backend.DTO;
using backend.Models;

namespace backend.Services.auth
{
    public interface IGoogleAuthService
    {
        // validate google token, tìm user theo email -> nếu chưa có thì tạo mới. Trả về user để AuthController tự tạo JWT (dùng chung CreateJwtToken với Login)
        Task<ServiceResult<User>> AuthenticateAsync(GoogleLoginDTO dto);
    }
}
