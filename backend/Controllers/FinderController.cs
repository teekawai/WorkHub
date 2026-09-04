using backend.DTO;
using backend.Models;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/finders")]
    [Authorize(Roles = "finder")]
    public class FinderController : Controller
    {
        //dependency injection
        private readonly WorkHubContext _context;
        private readonly ICloudinary _cloudinary;
        public FinderController(WorkHubContext _context, ICloudinary _cloudinary)
        {
            this._context = _context;
            this._cloudinary = _cloudinary;
        }
        

        [HttpGet("me")]

        public async Task<IActionResult> FinderProfile()
        {
            //claim này đã được nhúng trong JwtService rồi
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được

            var profile = await _context.Finderprofiles.FindAsync(currentUserId);
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
                LinkedIn = profile.LinkedIn,
                Major = profile.Major,
                Skill = profile.Skill,

            };
            return Ok(res);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateFinderProfile(FinderProfileRequestDTO dto)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (currentUserId == null)
            {
                return Unauthorized("Người dùng chưa đăng nhập");

            }
            var profile = await _context.Finderprofiles.FindAsync(currentUserId);
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
                };
                _context.Add(profile);
                await _context.SaveChangesAsync();
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

                await _context.SaveChangesAsync();
            }
            return Ok("Đã cập nhật thành profile thành công");
        }

        [HttpPost("me/avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile avatar)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (currentUserId == null)
            {
                return Unauthorized("Người dùng chưa đăng nhập");

            }
            var profile = await _context.Finderprofiles.FindAsync(currentUserId);
            
            // validate
            if (avatar == null || avatar.Length == 0) return BadRequest("Chưa có ảnh đại diện!");
            if (avatar.Length > 5 *1024 * 1024) return BadRequest("Dung lượng ảnh quá lớn!");

            var avtExtension = Path.GetExtension(avatar.FileName).ToLower();//lấy định dạng ảnh
            if (avtExtension != ".jpg" && avtExtension != ".png") return BadRequest("Sai định dạng ảnh");

            using var stream = avatar.OpenReadStream();// cloudinary không lấy thằng dữ liệu dạng iformfile được mà phải chuyển sang dạng stream(claude)
            var uploadParam = new ImageUploadParams
            {
                File = new FileDescription(avatar.FileName, stream),
                Folder = "WorkHub/finder/avatar"

            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParam);
            var url = uploadResult.SecureUrl.ToString();

            profile.Avatar = url;
            await _context.SaveChangesAsync();
            return Ok(url);
        }

        [HttpPost("me/cv")]
        public async Task<IActionResult> UploadCV(IFormFile cv)
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (currentUserId == null)
            {
                return Unauthorized("Người dùng chưa đăng nhập");

            }
            var profile = await _context.Finderprofiles.FindAsync(currentUserId);
            
            // validate
            if (cv == null || cv.Length == 0) return BadRequest("Chưa có ảnh đại diện!");
            if (cv.Length > 5 * 1024 * 1024) return BadRequest("Dung lượng ảnh quá lớn!");

            var cvExtension = Path.GetExtension(cv.FileName).ToLower();//lấy định dạng cv
            if (cvExtension != ".doc" && cvExtension != ".pdf") return BadRequest("CV phải gửi file .doc hoặc .pdf");

            using var stream = cv.OpenReadStream();// cloudinary không lấy thằng dữ liệu dạng iformfile được mà phải chuyển sang dạng stream(claude)
            var uploadParam = new RawUploadParams
            {
                File = new FileDescription(cv.FileName, stream),
                Folder = "WorkHub/finder/cv"

            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParam);
            var url = uploadResult.SecureUrl.ToString();

            profile.Cv = url;
            await _context.SaveChangesAsync();
            return Ok(url);
        }




    }
}
