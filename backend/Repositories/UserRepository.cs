using backend.Models;
using Microsoft.EntityFrameworkCore;
using System;

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
    }
}

