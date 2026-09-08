using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class RefreshToken
    {
        [Required]
        public string Token { get; set; } = null!;
        [Required]
        public string UserId { get; set; }= null!;
        public DateTime ExpireAt { get; set; }
        public bool IsRevoked { get; set; } = false;
        public virtual User User { get; set; } = null!;
    }
}
