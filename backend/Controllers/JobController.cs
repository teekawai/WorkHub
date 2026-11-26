using System.Security.Claims;
using backend.Common;
using backend.DTO.JobDTO;
using backend.Filters;
using backend.Services.jobs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace backend.Controllers
{
    // Chỉ nhận request, lấy employerId từ JWT rồi giao hết cho Service (CodingRules)
    [ApiController]
    [Route("api/jobs")]
    public class JobController : ControllerBase
    {
        private readonly IJobService _jobService;
        private readonly IJobSearchService _jobSearchService;

        public JobController(IJobService jobService, IJobSearchService jobSearchService)
        {
            _jobService = jobService;
            _jobSearchService = jobSearchService;
        }

        private string? EmployerId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        // Employer đã xác minh đăng Job mới -> 201 + Location
        [HttpPost]
        [Idempotent]
        [Authorize(Policy = "VerifiedEmployer")]
        public async Task<IActionResult> Create([FromBody] JobRequestDTO request)
        {
            var result = await _jobService.CreateByEmployerAsync(EmployerId!, request);
            return result.ToActionResult(job => Created($"/api/jobs/{job.JobId}", job));
        }

        // khách/Finder tìm kiếm Job công khai (Business 6)
        [HttpGet]
        [AllowAnonymous]
        [EnableRateLimiting("job_search")]
        public async Task<IActionResult> Search([FromQuery] JobQueryDTO query) =>
            (await _jobSearchService.SearchPublicAsync(query)).ToActionResult();

        // danh sách lựa chọn Category/Location/WorkType cho FE
        [HttpGet("options")]
        [AllowAnonymous]
        public IActionResult Options() => Ok(JobOptionsDTO.FromConstants());

        // khách/Finder xem chi tiết Job; Finder đăng nhập (token hợp lệ) thì có thêm hasApplied
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDetail(string id) =>
            (await _jobService.GetPublicDetailAsync(id, User.IsInRole("finder") ? User.FindFirst(ClaimTypes.NameIdentifier)?.Value : null)).ToActionResult();

        [HttpPut("{id}")]
        [Authorize(Policy = "VerifiedEmployer")]
        public async Task<IActionResult> Update(string id, [FromBody] JobRequestDTO request) =>
            (await _jobService.UpdateByOwnerAsync(EmployerId!, id, request)).ToActionResult();

        [HttpPatch("{id}/status")]
        [Authorize(Policy = "VerifiedEmployer")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] JobStatusDTO request) =>
            (await _jobService.CloseByOwnerAsync(EmployerId!, id, request)).ToActionResult();

        [HttpDelete("{id}")]
        [Authorize(Policy = "VerifiedEmployer")]
        public async Task<IActionResult> Delete(string id) =>
            (await _jobService.DeleteByOwnerAsync(EmployerId!, id))
                .ToActionResult(_ => Ok(new { message = "Đã xóa tin tuyển dụng" }));

        // danh sách Job của chính Employer (kể cả chưa xác minh — chỉ xem)
        [HttpGet("/api/employer/jobs")]
        [Authorize(Roles = "employer")]
        public async Task<IActionResult> GetMyJobs([FromQuery] int page = 1, [FromQuery] int limit = 30, [FromQuery] string? keyword = null, [FromQuery] string? status = null) =>
            (await _jobService.GetListForOwnerAsync(EmployerId!, page, limit, keyword, status)).ToActionResult();

        [HttpGet("/api/employer/jobs/{id}")]
        [Authorize(Roles = "employer")]
        public async Task<IActionResult> GetMyJobDetail(string id) =>
            (await _jobService.GetDetailForOwnerAsync(EmployerId!, id)).ToActionResult();
    }
}
