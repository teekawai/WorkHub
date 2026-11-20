using backend.Common;
using backend.DTO.AdminDTO;

namespace backend.Services.admin
{
    public interface IAdminEmployerService
    {
        Task<ServiceResult<PagedResult<AdminEmployerListItemDTO>>> SearchAsync(AdminEmployerQueryDTO query);
        Task<ServiceResult<string>> VerifyAsync(string userId, VerifyRequestDTO request);
        Task<ServiceResult<UnverifyResultDTO>> UnverifyAsync(string userId, UnverifyRequestDTO request);
    }
}
