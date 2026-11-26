using backend.Common;
using backend.DTO.ApplicationDTO;

namespace backend.Services.applications
{
    public interface IApplicationService
    {
        Task<ServiceResult<ApplicationResponseDTO>> ApplyAsync(string finderId, string jobId, ApplyRequestDTO request);
    }
}
