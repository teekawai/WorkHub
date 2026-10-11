using backend.DTO;
using backend.DTO.EmployerDTO;
using backend.DTO.FinderProfileDTO;
using backend.Models;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
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
        private readonly ICloudinary _cloudinary;
        public EmployerController(WorkHubContext context, ICloudinary cloudinary)
        {
            _context = context;
            _cloudinary = cloudinary;
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
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var profile = await _context.Employerprofiles.FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (profile == null)
            {
                return NotFound("Chưa có hồ sơ");
            }

            // validate
            if (avatar == null || avatar.Length == 0) return BadRequest("Chưa có ảnh đại diện!");
            if (avatar.Length > 2 * 1024 * 1024) return BadRequest("Dung lượng ảnh quá lớn!");

            var avtExtension = Path.GetExtension(avatar.FileName).ToLower();//lấy định dạng ảnh
            if (avtExtension != ".jpg" && avtExtension != ".png") return BadRequest("Sai định dạng ảnh");

            using var stream = avatar.OpenReadStream();// cloudinary không lấy thằng dữ liệu dạng iformfile được mà phải chuyển sang dạng stream(claude)
            var uploadParam = new ImageUploadParams
            {
                File = new FileDescription(avatar.FileName, stream),
                Folder = "WorkHub/employer/logo"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParam);
            var url = uploadResult.SecureUrl.ToString();

            profile.Logo = url;
            await _context.SaveChangesAsync();
            return Ok(url);
        }


    }
}
