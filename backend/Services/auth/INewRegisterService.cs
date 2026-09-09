using backend.DTO;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.auth
{
    public interface INewRegisterService
    {
        public Task<Result> CreateUser(RegisterDTO dto);
    }

    public enum ErrorCode
    {
        Success,
        NotFound,
        BadRequest, 
        Conflict,
    }

    public class Result
    {
        public bool isSuccess {  get; set; }
        public ErrorCode code { get; set; }
        public string? message { get; set; }
        public User? data { get; set; }
    }

    public class RegisterService : INewRegisterService
    {
        private readonly WorkHubContext _context;
        public RegisterService(WorkHubContext context)
        {
            this._context = context;
        }

        public async Task<Result> CreateUser(RegisterDTO dto) {
            //validate dữ liệu
            if (dto == null)
            {
                return new Result
                {
                    isSuccess = false,
                    code = ErrorCode.NotFound,
                    message = "Dữ liệu không hợp lệ"
                };
            }

            if (string.IsNullOrEmpty(dto.Username) ||
            string.IsNullOrEmpty(dto.Password) ||
            string.IsNullOrEmpty(dto.Email))
            {
                return new Result
                {
                    isSuccess = false,
                    code = ErrorCode.NotFound,
                    message = "Hãy điền đầy đủ thông tin"
                };
            }

            var existEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existEmail !=null)
            {
                return new Result
                {
                    isSuccess = false,
                    code = ErrorCode.Conflict,
                    message = "Email đã được đăng ký"
                };
            }

            if (dto.Role != "finder" && dto.Role != "employer")
            {
                return new Result
                {
                    isSuccess = false,
                    code = ErrorCode.BadRequest,
                    message = "Chọn role của bạn!"
                };
            }

            if (dto.Password.Length < 8)
            {
                return new Result
                {
                    isSuccess = false,
                    code = ErrorCode.BadRequest,
                    message = "Nhập mật khẩu dài hơn 8 ký tự"
                };
            }

            //hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 11);

            //tạo user mới với thông mật khẩu bảo mật
            var newUser = new User
            {
                UserId = Guid.NewGuid().ToString(),
                Username = dto.Username,
                Email = dto.Email.Trim().ToLower(),
                PasswordHash = passwordHash,
                Role = dto.Role,
            };
            //thêm và lưu user vào database
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return new Result
            {
                isSuccess = true,
                code = ErrorCode.Success,
                message = "Đăng ký thành công",
                data = newUser
            };
        }
    }
}
