using System;
using backend.DTO.AuthDTO;
using backend.DTO;
using backend.Models;
using backend.Repositories;
using backend.Common;

namespace backend.Services.auth;

public class LoginService : ILoginService
{

    //inject các service
    private readonly UserRepository _repo;
    private readonly WorkHubContext _context;
    public LoginService(UserRepository _repo, WorkHubContext _context)
    {
        this._repo = _repo;
        this._context = _context;
    }

    public async Task<ServiceResult<User>> LoginResult(LoginRequestDTO dto)
    {

        var user = await _repo.GetUserByEmail(dto.Email);

        if (user == null)
        {
            return ServiceResult<User>.Fail(ErrorCode.Unauthorized, "Sai tài khoản hoặc mật khẩu");
        }
        if (user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return ServiceResult<User>.Fail(ErrorCode.Unauthorized, "Sai tài khoản hoặc mật khẩu");
        }

        //tạo token và lưu redis giờ đã chuyển sang AuthController (CreateJwtToken) để dùng chung cho cả Login và GoogleAuth
        return ServiceResult<User>.Success(user, "Đăng nhập thành công");

    }

}
