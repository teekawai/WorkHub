using backend.DTO;
using backend.DTO.EmployerDTO;
using backend.DTO.FinderProfileDTO;
using backend.Models;
using Microsoft.AspNetCore.RateLimiting;
using backend.Services.files;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Controllers
{
    [Route("api/employer")]
    [Authorize(Roles = "employer")]
    
    public class EmployerController : Controller
    {
        private readonly WorkHubContext _context;
        private readonly IFileUploadService _fileUploadService;
        public EmployerController(WorkHubContext context, IFileUploadService fileUploadService)
        {
            _context = context;
            _fileUploadService = fileUploadService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetEmployerProfile()
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var profile = await _context.Employerprofiles.AsNoTracking().Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }
            var res = new EmployerProfileResDTO
            {
                CompanyName = profile.CompanyName,
                Address = profile.Address,
                Description = profile.Description,
                Website = profile.Website,
                FoundedYear = profile.FoundedYear,
                TaxCode = profile.TaxCode,
                Phone = profile.Phone,
                Email = profile.User.Email,
                Field = profile.Field
            };
            return Ok(res);
        }


        /* phần này là update dữ liệu, nếu mà hồ sơ người dùng chưa có dữ liệu thì cho phép thêm mới, còn không thì sửa bình thường */
        [HttpPut("me")]
        public async Task<IActionResult> UpdateFinderProfile(EmployerProfileReq dto)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var profile = await _context.Employerprofiles.FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được

            //không thấy profile thì thêm mới
            if (profile == null)
            {
                profile = new Employerprofile
                {
                    UserId = currentUserId,
                    CompanyName = dto.CompanyName,
                    Address = dto.Address,
                    Description = dto.Description,
                    Website = dto.Website,
                    FoundedYear = dto.FoundedYear,
                    TaxCode = dto.TaxCode,
                    Phone = dto.Phone,
                    Field = dto.Field
                };
                _context.Add(profile);

            }
            //sửa
            else
            {
                var duplicateName = await _context.Employerprofiles
                    .AnyAsync(e => e.CompanyName == dto.CompanyName && e.UserId != currentUserId);
                if (duplicateName) return Conflict(new { message = "Tên công ty đã tồn tại" });

                var duplicateTax = await _context.Employerprofiles
                    .AnyAsync(e => e.TaxCode == dto.TaxCode && e.UserId != currentUserId);
                if (duplicateTax) return Conflict(new { message = "Mã số thuế đã tồn tại" });

                profile.CompanyName = dto.CompanyName;
                profile.Address = dto.Address;
                profile.Description = dto.Description;
                profile.Website = dto.Website;
                profile.FoundedYear = dto.FoundedYear;
                profile.TaxCode = dto.TaxCode;
                profile.Phone = dto.Phone;
                profile.Field = dto.Field;
            }
            await _context.SaveChangesAsync();
            return Ok(profile);
        }

        [HttpPost("me/logo")]
        [EnableRateLimiting("upload_cv_avt")]
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var profile = await _context.Employerprofiles.Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }
            string logoFolder = $"WorkHub/employer/logo/{profile.UserId}"; //tách theo từng employer, trước đây để chung 1 folder cho mọi employer
            string logoPublicId = $"{logoFolder}/{profile.User.Username}_Logo"; //cố định theo user -> upload sau sẽ ghi đè đúng file này, không tạo file mới

            var result = await _fileUploadService.Upload_CV_AVT(avatar, logoFolder, logoPublicId, new[] { ".jpg", ".png" }, 2 * 1024 * 1024);
            if (!result.IsSuccess)
            {
                return BadRequest(result.ErrorMessage);
            }

            profile.Logo = result.Url;
            await _context.SaveChangesAsync();
            return Ok(result.Url);
        }
    }
}
