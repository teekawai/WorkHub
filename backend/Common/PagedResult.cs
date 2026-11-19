namespace backend.Common;

// Format phân trang dùng chung { items, pagination } (Business 6.7, CodingRules)
public record PagedResult<T>(List<T> Items, Pagination Pagination);

public record Pagination(int TotalItems, int TotalPages, int CurrentPage, int Limit);
