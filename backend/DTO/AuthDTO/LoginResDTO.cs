using backend.Models;
using System.ComponentModel.DataAnnotations;

namespace backend.DTO.AuthDTO
{
    public class LoginResDTO
    {

        public string accessToken { get; set; } = null!;
        public RefreshToken refreshToken { get; set; } = null!;
        
        public string UserId { get; set; } =null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "finder";
    }
}
