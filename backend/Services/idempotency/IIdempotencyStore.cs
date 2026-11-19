namespace backend.Services.idempotency;

// Bản ghi lưu trong store. Token là mã riêng của request giữ chỗ, để request chạy quá TTL không xóa/ghi đè key của request khác.
// Completed=false là đang xử lý (chỉ giữ chỗ), true là đã có response để phát lại.
public record IdempotencyEntry(string BodyHash, string Token, bool Completed, int Status = 0, string? Body = null, string? Location = null);

public interface IIdempotencyStore
{
    // SET NX: true nếu giành được key, false nếu key đã tồn tại
    Task<bool> TryReserveAsync(string key, IdempotencyEntry pending, TimeSpan ttl);
    Task<IdempotencyEntry?> GetAsync(string key);
    // ghi đè khi xử lý xong, chỉ khi key vẫn thuộc về entry.Token
    Task SaveAsync(string key, IdempotencyEntry entry, TimeSpan ttl);
    // xóa key, chỉ khi key vẫn thuộc về token
    Task DeleteAsync(string key, string token);
}
