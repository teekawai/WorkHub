using backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using backend.Services.admin;

namespace backend.Repositories
{
    public class UserRepository
    {
        private readonly WorkHubContext _workHubContext;

        public UserRepository(WorkHubContext _context)
        {
            this._workHubContext = _context;
        }
        public async Task<User> GetUserByEmail(string email)
        {
            return await _workHubContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        // chỉ tìm trong admin: user thường cùng email không đăng nhập được qua cổng admin
        public async Task<User?> GetAdminByEmail(string email)
        {
            return await _workHubContext.Users.FirstOrDefaultAsync(u => u.Email == email && u.Role == AdminSeeder.Role);
        }
    }
}

