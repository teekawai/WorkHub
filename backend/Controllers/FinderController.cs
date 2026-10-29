using backend.DTO;
using backend.DTO.FinderProfileDTO;
using backend.Models;
using backend.Services.files;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;
using System.Security.Claims;
using System.Text;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/finders/")]
    [Authorize(Roles = "finder")]
    public class FinderController : ControllerBase
    {
        //dependency injection
        private readonly WorkHubContext _context;
        private readonly IFileUploadService _fileUploadService;
        
        public FinderController(WorkHubContext _context, IFileUploadService fileUploadService)
        {
            this._context = _context;
            this._fileUploadService = fileUploadService;
        }

        private string getUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
        
        [HttpGet("me")]
        public async Task<IActionResult> FinderProfile()
        {
            string currentUserId = getUserId();
            var profile = await _context.Finderprofiles.AsNoTracking().Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId);
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }
            var res = new FinderProfileResponseDTO
            {
                Fullname = profile.Fullname,
                Phone = profile.Phone,
                Avatar = profile.Avatar,
                Description = profile.Description,
                Address = profile.Address,
                EducationLevel = profile.EducationLevel,
                Experience = profile.Experience,
                Cv = profile.Cv,
                LinkedIn = profile.LinkedIn,
                Major = profile.Major,
                Skill = profile.Skill,
                Email = profile.User.Email,
                DateOfBirth = profile.DateOfBirth,
                Gender = profile.Gender
            };
            return Ok(res);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateFinderProfile(FinderProfileRequestDTO dto)
        {
            string currentUserId = getUserId();
            var profile = await _context.Finderprofiles.FirstOrDefaultAsync(u => u.UserId == currentUserId);
            
            if (profile == null)
            {
                profile = new Finderprofile
                {
                    UserId = currentUserId,
                    Fullname = dto.Fullname,
                    Phone = dto.Phone,
                    Description = dto.Description,
                    EducationLevel = dto.EducationLevel,
                    Address = dto.Address,
                    Experience = dto.Experience,
                    LinkedIn = dto.LinkedIn,
                    Major = dto.Major,
                    Skill = dto.Skill,
                    DateOfBirth=dto.DateOfBirth,
                    Gender=dto.Gender
                };
                _context.Add(profile);
            }
            else
            {
                profile.Fullname = dto.Fullname;
                profile.Phone = dto.Phone;
                profile.Description = dto.Description;
                profile.EducationLevel = dto.EducationLevel;
                profile.Address = dto.Address;
                profile.Experience = dto.Experience;
                profile.LinkedIn = dto.LinkedIn;
                profile.Major = dto.Major;
                profile.Skill = dto.Skill;
                profile.DateOfBirth = dto.DateOfBirth;
                profile.Gender = dto.Gender;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Lỗi cập nhật hồ sơ hoặc xung đột dữ liệu." });
            }

            return Ok(profile);
        }

        [HttpPost("me/avatar")]
        [EnableRateLimiting("upload_cv_avt")]
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            string currentUserId = getUserId();
            var profile = await _context.Finderprofiles.Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId);
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }
            string avatarFolder = $"WorkHub/finder/avatar/{profile.UserId}";
            string avatarPublicId = $"{avatarFolder}/{profile.User.Username}_Avatar";

            var result = await _fileUploadService.Upload_CV_AVT(avatar, avatarFolder, avatarPublicId, new[] { ".jpg", ".png" }, 2 * 1024 * 1024);
            if (!result.IsSuccess)
            {
                return BadRequest(result.ErrorMessage);
            }

            profile.Avatar = result.Url;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception)
            {
                // TR-1: Rollback xóa file Cloudinary nếu lưu DB thất bại
                await _fileUploadService.DeleteFileAsync(avatarPublicId);
                return StatusCode(500, new { message = "Lỗi khi lưu avatar vào cơ sở dữ liệu." });
            }
            return Ok(result.Url);
        }

        [HttpPost("me/cv")]
        [EnableRateLimiting("upload_cv_avt")]
        public async Task<IActionResult> UploadCV([FromForm]IFormFile cv)
        {
            string currentUserId = getUserId();
            var profile = await _context.Finderprofiles.Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId);
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }
            string CVfolder = $"WorkHub/finder/cv/{profile.UserId}";
            string CVpublicId = $"{CVfolder}/{profile.User.Username}_CV";

            var result = await _fileUploadService.Upload_CV_AVT(cv, CVfolder, CVpublicId, new[] { ".docx", ".pdf" }, 5 * 1024 * 1024, isRaw: true);
            if (!result.IsSuccess)
            {
                return BadRequest(result.ErrorMessage);
            }

            profile.Cv = result.Url;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception)
            {
                // TR-1: Rollback xóa file Cloudinary nếu lưu DB thất bại
                await _fileUploadService.DeleteFileAsync(CVpublicId, isRaw: true);
                return StatusCode(500, new { message = "Lỗi khi lưu CV vào cơ sở dữ liệu." });
            }
            return Ok(result.Url);
        }
    }
}
