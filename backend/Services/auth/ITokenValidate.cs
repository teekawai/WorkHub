using System.Security.Claims;
using backend.Common;

namespace backend.Services.auth
{
    public interface ITokenValidate
    {
        public Task<ServiceResult<ClaimsPrincipal>> ValidateToken(string token);
    }
}
