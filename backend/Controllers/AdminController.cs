using backend.Common;
using backend.DTO.AdminDTO;
using backend.Services.admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    // Chỉ Admin; nhận request rồi giao hết cho Service
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminEmployerService _employerService;

        public AdminController(IAdminEmployerService employerService) => _employerService = employerService;

        // danh sách công ty (đã/chưa xác minh) để Admin duyệt
        [HttpGet("employers")]
        public async Task<IActionResult> Search([FromQuery] AdminEmployerQueryDTO query) =>
            (await _employerService.SearchAsync(query)).ToActionResult();

        // xác minh công ty (không đụng Job đã đóng); body là tên + MST admin đang xem
        [HttpPatch("employers/{userId}/verify")]
        public async Task<IActionResult> Verify(string userId, [FromBody] VerifyRequestDTO request) =>
            (await _employerService.VerifyAsync(userId, request)).ToActionResult(m => Ok(new { message = m }));

        // thu hồi xác minh + đóng mọi Job Open của công ty
        [HttpPatch("employers/{userId}/unverify")]
        public async Task<IActionResult> Unverify(string userId, [FromBody] UnverifyRequestDTO request) =>
            (await _employerService.UnverifyAsync(userId, request)).ToActionResult();
    }
}
