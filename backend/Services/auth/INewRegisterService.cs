using backend.DTO;
using backend.Models;
using backend.Common;

namespace backend.Services.auth
{
    public interface INewRegisterService
    {
        public Task<ServiceResult<User>> CreateUser(RegisterDTO dto);
    }
}
