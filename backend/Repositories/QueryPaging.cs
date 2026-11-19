using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

public static class QueryPaging
{
    // query đã sắp xếp; đếm tổng rồi lấy 1 trang
    public static async Task<(List<T> Items, int TotalItems)> ToPageAsync<T>(this IQueryable<T> ordered, int page, int limit)
    {
        var total = await ordered.CountAsync();
        // offset tính bằng long: page lớn làm int tràn -> OFFSET âm. Vượt tổng thì trả rỗng, không query nữa (Business 6.7)
        var offset = (long)(page - 1) * limit;
        if (offset >= total) return (new List<T>(), total);
        var items = await ordered.Skip((int)offset).Take(limit).ToListAsync();
        return (items, total);
    }
}
