using backend.Common;
using backend.DTO;
using backend.DTO.EmployerDTO;
using backend.DTO.FinderProfileDTO;
using backend.Models;
using Microsoft.AspNetCore.RateLimiting;
using backend.Services.files;
using backend.Services.cache;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
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
        private readonly IProfileCache _cache;
        public EmployerController(WorkHubContext context, IFileUploadService fileUploadService, IProfileCache cache)
        {
            _context = context;
            _fileUploadService = fileUploadService;
            _cache = cache;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetEmployerProfile()
        {
            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            // cache-aside: hit trả DTO qua cùng formatter như miss; chỉ cache DTO, không cache entity (có User -> PasswordHash)
            var cached = await _cache.GetAsync<EmployerProfileResDTO>(ProfileRoles.Employer, currentUserId);
            if (cached != null) return Ok(cached);
            var profile = await _context.Employerprofiles.AsNoTracking().Include(p => p.User).FirstOrDefaultAsync(u => u.UserId == currentUserId); // cái này là lấy UserId từ Jwt token, nếu muốn lấy role thì thay nameIdentifier thành roles là được
            if (profile == null)
            {
                return NotFound(new ApiError(ApiErrorCodes.NotFound, "Chưa có hồ sơ")); // không cache 404
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
                IsVerified = profile.IsVerified,
                UnverifyReason = profile.UnverifyReason
            };
            await _cache.SetAsync(ProfileRoles.Employer, currentUserId, res);
            return Ok(res);
        }


        /* phần này là update dữ liệu, nếu mà hồ sơ người dùng chưa có dữ liệu thì cho phép thêm mới, còn không thì sửa bình thường */
        [HttpPut("me")]
        public async Task<IActionResult> UpdateEmployerProfile(EmployerProfileReq dto)
        {
            try { return await UpdateEmployerProfileOnce(dto); }
            catch (Exception ex) when (DbErrors.IsDeadlock(ex))
            {
                // phòng hờ: MySQL đã rollback tx nạn nhân, tracker còn entity cũ -> xóa rồi làm lại 1 lần
                _context.ChangeTracker.Clear();
                return await UpdateEmployerProfileOnce(dto);
            }
        }

        private async Task<IActionResult> UpdateEmployerProfileOnce(EmployerProfileReq dto)
        {
            if (dto.FoundedYear > VnTime.Today().Year)
            {
                return BadRequest(new ApiError(ApiErrorCodes.ValidationError, "Dữ liệu không hợp lệ",
                    new Dictionary<string, string[]> { ["foundedYear"] = new[] { "Năm thành lập phải từ 1800 đến năm hiện tại" } }));
            }

            string currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            // READ COMMITTED: REPEATABLE READ khiến FOR UPDATE trên dòng chưa tồn tại lấy gap lock -> 2 employer khác nhau tạo hồ sơ lần đầu deadlock (F-4).
            // Khóa ghi dòng profile tới khi commit: admin verify (UPDATE có điều kiện tên/MST theo view) phải chờ PUT xong hoặc chạy trước hẳn,
            // nếu không PUT ghi đè tên/MST lên dòng đã verify (PLAN_Admin 3.3, I-1). Return sớm -> dispose tx -> rollback.
            // ToListAsync, không FirstOrDefault: EF bọc câu SQL vào subquery + LIMIT, FOR UPDATE nằm trong derived table
            await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            var profile = (await _context.Employerprofiles
                .FromSqlInterpolated($"SELECT * FROM employerprofile WHERE userId = {currentUserId} FOR UPDATE")
                .ToListAsync()).FirstOrDefault();

            //check trùng cho cả tạo mới lẫn sửa (trước đây chỉ check ở nhánh sửa -> tạo mới bị trùng tax code / 500 khi trùng tên)
            var duplicateName = await _context.Employerprofiles
                .AnyAsync(e => e.CompanyName == dto.CompanyName && e.UserId != currentUserId);
            if (duplicateName) return Conflict(new ApiError(ApiErrorCodes.CompanyNameTaken, "Tên công ty này đã được sử dụng"));

            var duplicateTax = await _context.Employerprofiles
                .AnyAsync(e => e.TaxCode == dto.TaxCode && e.UserId != currentUserId);
            if (duplicateTax) return Conflict(new ApiError(ApiErrorCodes.TaxCodeTaken, "Mã số thuế này đã được sử dụng"));

            //không thấy profile thì thêm mới
            if (profile == null)
            {
                profile = new Employerprofile
                {
                    UserId = currentUserId,
                    CompanyName = dto.CompanyName,
                    // shortcut: mã trùng (~1/2 tỷ) rơi vào nhánh CompanyNameTaken bên dưới, không retry
                    SlugCode = Slug.NewCode(),
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
                //đã verify thì khóa companyName + taxCode (định danh pháp lý được xác minh), FE luôn gửi cả form nên chỉ chặn khi giá trị thật sự khác
                if (profile.IsVerified)
                {
                    if (dto.CompanyName != profile.CompanyName)
                        return Conflict(new ApiError(ApiErrorCodes.CompanyNameLocked, "Công ty đã được xác minh nên không thể đổi tên công ty. Vui lòng liên hệ hỗ trợ"));
                    if (dto.TaxCode != profile.TaxCode)
                        return Conflict(new ApiError(ApiErrorCodes.TaxCodeLocked, "Công ty đã được xác minh nên không thể đổi mã số thuế. Vui lòng liên hệ hỗ trợ"));
                }

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
                await tx.CommitAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is MySqlException { ErrorCode: MySqlErrorCode.DuplicateKeyEntry } dup)
            {
                // 2 request cùng lúc lọt qua bước check trùng -> unique index chặn lại, trả 409 thay vì 500.
                // MySQL báo "Duplicate entry '...' for key 'employerprofile.<tên index>'" -> dựa vào tên index để biết trùng cột nào
                return dup.Message.Contains("'employerprofile.taxCode'")
                    ? Conflict(new ApiError(ApiErrorCodes.TaxCodeTaken, "Mã số thuế này đã được sử dụng"))
                    : Conflict(new ApiError(ApiErrorCodes.CompanyNameTaken, "Tên công ty này đã được sử dụng"));
            }
            await _cache.RemoveAsync(ProfileRoles.Employer, currentUserId); // sau commit, không trước
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
                return NotFound(new ApiError(ApiErrorCodes.NotFound, "Chưa có hồ sơ"));
            }
            string logoFolder = $"WorkHub/employer/logo/{profile.UserId}"; //tách theo từng employer, trước đây để chung 1 folder cho mọi employer
            string logoPublicId = $"{logoFolder}/{profile.User.Username}_Logo"; //cố định theo user -> upload sau sẽ ghi đè đúng file này, không tạo file mới

            var result = await _fileUploadService.Upload_CV_AVT(avatar, logoFolder, logoPublicId, new[] { ".jpg", ".png" }, 5 * 1024 * 1024);
            if (!result.IsSuccess)
            {
                return BadRequest(new ApiError(ApiErrorCodes.ValidationError, result.ErrorMessage!));
            }

            profile.Logo = result.Url;
            await _context.SaveChangesAsync();
            await _cache.RemoveAsync(ProfileRoles.Employer, currentUserId);
            return Ok(result.Url);
        }
    }
}
