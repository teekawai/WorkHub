using backend.DTO;
using backend.Models;
using backend.Common;

namespace backend.Services.auth
{
    public interface ILoginService
    {
        public Task<ServiceResult<User>> LoginResult(LoginRequestDTO dto);
    }
}
