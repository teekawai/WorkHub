using System.Security.Claims;
using backend.DTO.ApplicationDTO;
using backend.Common;
using backend.Filters;
using backend.Services.applications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace backend.Controllers
{
    // Chỉ nhận request, lấy finderId từ JWT rồi giao hết cho Service (CodingRules)
    [ApiController]
    public class ApplicationController : ControllerBase
    {
        private readonly IApplicationService _service;

        public ApplicationController(IApplicationService service) => _service = service;

        // Finder nộp đơn -> 201 (không có Location: chưa có API xem chi tiết 1 đơn)
        [HttpPost("api/jobs/{jobId}/applications")]
        [Authorize(Roles = "finder")]
        [Idempotent]
        [EnableRateLimiting("apply")]
        public async Task<IActionResult> Apply(string jobId, [FromForm] ApplyRequestDTO request)
        {
            var finderId = User.FindFirst(ClaimTypes.NameIdentifier)!.Value;
            var result = await _service.ApplyAsync(finderId, jobId, request);
            return result.ToActionResult(dto => StatusCode(StatusCodes.Status201Created, dto));
        }
    }
}
