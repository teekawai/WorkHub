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
    [ApiController]
    [Route("api/employer")]
    [Authorize(Roles = "employer")]
    
    public class EmployerController : ControllerBase
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
                Logo = profile.Logo,
                FoundedYear = profile.FoundedYear,
                TaxCode = profile.TaxCode,
                Phone = profile.Phone,
                Email = profile.User.Email,
                Field = profile.Field,
                IsVerified = profile.IsVerified
            };
            return Ok(res);
        }


        /* phần này là update dữ liệu, nếu mà hồ sơ người dùng chưa có dữ liệu thì cho phép thêm mới, còn không thì sửa bình thường */
        [HttpPut("me")]
        public async Task<IActionResult> UpdateEmployerProfile(EmployerProfileReq dto)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var profile = await _context.Employerprofiles.FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được

            //check trùng cho cả tạo mới lẫn sửa (trước đây chỉ check ở nhánh sửa -> tạo mới bị trùng tax code / 500 khi trùng tên)
            var duplicateName = await _context.Employerprofiles
                .AnyAsync(e => e.CompanyName == dto.CompanyName && e.UserId != currentUserId);
            if (duplicateName) return Conflict(new { message = "This company name is already in use." });

            var duplicateTax = await _context.Employerprofiles
                .AnyAsync(e => e.TaxCode == dto.TaxCode && e.UserId != currentUserId);
            if (duplicateTax) return Conflict(new { message = "This tax code is already in use." });

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
                profile.CompanyName = dto.CompanyName;
                profile.Address = dto.Address;
                profile.Description = dto.Description;
                profile.Website = dto.Website;
                profile.FoundedYear = dto.FoundedYear;
                profile.TaxCode = dto.TaxCode;
                profile.Phone = dto.Phone;
                profile.Field = dto.Field;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                //2 request cùng lúc lọt qua bước check trùng -> unique index companyName chặn lại, trả 409 thay vì 500
                return Conflict(new { message = "This company name is already in use." });
            }
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

            var result = await _fileUploadService.Upload_CV_AVT(avatar, logoFolder, logoPublicId, new[] { ".jpg", ".png" }, 5 * 1024 * 1024);
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
