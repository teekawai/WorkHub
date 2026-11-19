namespace backend.Services.admin
{
    // Kết quả giữ lượt: Allowed = được Verify mật khẩu; ngược lại RetryAfter = thời gian khóa còn lại;
    // JustLocked = chính lượt này vừa kích hoạt khóa (để log đúng 1 lần)
    public record LoginAttemptGate(bool Allowed, TimeSpan? RetryAfter, bool JustLocked);

    // Khóa đăng nhập admin theo IP. Lượt được tính TRƯỚC khi Verify nên request song song không vượt được giới hạn.
    public interface ILoginAttemptLimiter
    {
        Task<LoginAttemptGate> TryBeginAttemptAsync(string ip);

        // Đăng nhập đúng: xóa bộ đếm sai (không xóa khóa)
        Task ResetAsync(string ip);
    }
}
