using System;
using backend.DTO;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using backend.Common;
namespace backend.Services.auth;

public class RegisterService : INewRegisterService
{
    private readonly WorkHubContext _context;
    public RegisterService(WorkHubContext context)
    {
        this._context = context;
    }

    public async Task<ServiceResult<User>> CreateUser(RegisterDTO dto)
    {
        //validate dữ liệu
        if (dto == null)
        {
            return ServiceResult<User>.Fail(ErrorCode.NotFound, "Dữ liệu không hợp lệ");
        }

        if (string.IsNullOrEmpty(dto.Username) ||
        string.IsNullOrEmpty(dto.Password) ||
        string.IsNullOrEmpty(dto.Email))
        {
            return ServiceResult<User>.Fail(ErrorCode.NotFound, "Hãy điền đầy đủ thông tin");
        }

        var existEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (existEmail != null)
        {
            return ServiceResult<User>.Fail(ErrorCode.Conflict, "Email đã được đăng ký");
        }

        if (dto.Role != "finder" && dto.Role != "employer")
        {
            return ServiceResult<User>.Fail(ErrorCode.BadRequest, "Chọn role của bạn!");
        }

        if (dto.Password.Length < 8)
        {
            return ServiceResult<User>.Fail(ErrorCode.BadRequest, "Nhập mật khẩu dài hơn 8 ký tự");
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
        return ServiceResult<User>.Success(newUser, "Đăng ký thành công");
    }
}
