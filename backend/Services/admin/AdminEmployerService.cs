using backend.Common;
using backend.DTO.AdminDTO;
using backend.Repositories;
using backend.Services.cache;

namespace backend.Services.admin
{
    public class AdminEmployerService : IAdminEmployerService
    {
        private const int MaxReasonLength = 500;
        private readonly IEmployerRepository _repo;
        private readonly IProfileCache _cache;

        public AdminEmployerService(IEmployerRepository repo, IProfileCache cache)
        {
            _repo = repo;
            _cache = cache;
        }

        //tìm kiếm danh các công ty theo từ khóa trong tên
        public async Task<ServiceResult<PagedResult<AdminEmployerListItemDTO>>> SearchAsync(AdminEmployerQueryDTO query)
        {
            var keyword = string.IsNullOrWhiteSpace(query.Keyword) ? null : query.Keyword.Trim();
            var errors = Paging.Validate(query.Page, query.Limit);
            if (keyword?.Length > SearchText.MaxKeywordLength) errors["keyword"] = new[] { SearchText.KeywordTooLongMessage };
            if (errors.Count > 0) return ServiceResult<PagedResult<AdminEmployerListItemDTO>>.ValidationFail(errors);

            var limit = Paging.ClampLimit(query.Limit);
            var (rows, total) = await _repo.SearchForAdminAsync(employers =>
            {
                if (keyword != null)
                {
                    // so khớp giống search Job (PLAN_Admin 3.1): đ/Đ -> d ở cả 2 phía
                    var kw = SearchText.Normalize(keyword);
                    employers = employers.Where(e => e.CompanyName.Replace("đ", "d").Replace("Đ", "d").Contains(kw)
                        || e.User.Email.Replace("đ", "d").Replace("Đ", "d").Contains(kw));
                }
                if (query.IsVerified != null) employers = employers.Where(e => e.IsVerified == query.IsVerified);
                return employers.OrderBy(e => e.CompanyName).ThenBy(e => e.UserId);
            }, query.Page, limit);

            return ServiceResult<PagedResult<AdminEmployerListItemDTO>>.Success(
                new PagedResult<AdminEmployerListItemDTO>(rows.Select(AdminEmployerListItemDTO.FromRow).ToList(), Paging.Build(total, query.Page, limit)));
        }

        private static ServiceResult<T> NotFound<T>() =>
            ServiceResult<T>.Fail(ErrorCode.NotFound, "Không tìm thấy công ty", ApiErrorCodes.EmployerNotFound);


        //Xác minh công ty
        public async Task<ServiceResult<string>> VerifyAsync(string userId, VerifyRequestDTO request)
        {
            var result = await VerifyCoreAsync(userId, request);
            // mọi nhánh Success (kể cả "đã verify", xen giữa, thử lại) đều xóa cache hồ sơ; repo đã commit xong
            if (result.IsSuccess) await _cache.RemoveAsync(ProfileRoles.Employer, userId);
            return result;
        }

        private async Task<ServiceResult<string>> VerifyCoreAsync(string userId, VerifyRequestDTO request)
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(request.CompanyName)) errors["companyName"] = new[] { "Thiếu tên công ty đang xem" };
            if (string.IsNullOrWhiteSpace(request.TaxCode)) errors["taxCode"] = new[] { "Thiếu mã số thuế đang xem" };
            if (errors.Count > 0) return ServiceResult<string>.ValidationFail(errors);

            const string AlreadyVerified = "Công ty đã được xác minh";
            var state = await _repo.GetVerifyStateAsync(userId);
            if (state == null) return NotFound<string>();
            if (state == true) return ServiceResult<string>.Success(AlreadyVerified);
            // so nguyên văn (không trim): profile lưu nguyên văn, FE gửi lại đúng giá trị nhận từ GET
            if (await _repo.VerifyAsync(userId, request.CompanyName!, request.TaxCode!)) return ServiceResult<string>.Success("Đã xác minh công ty");

            // 0 dòng khớp: đọc lại để biết lý do. Trạng thái có thể bị đảo xen giữa (verify/unverify của admin khác) trong khi tên/MST không đổi
            // -> chỉ báo 409 khi tên/MST thật sự khác, còn khớp thì thử lại UPDATE (PLAN_Admin 3.3)
            const int MaxRetries = 3;
            for (var retry = 0; ; retry++)
            {
                var snap = await _repo.GetVerifySnapshotAsync(userId);
                if (snap == null) return NotFound<string>();
                if (snap.Value.IsVerified) return ServiceResult<string>.Success(AlreadyVerified); // có người verify xen giữa
                // hết lượt thử vẫn trả CHANGED dù tên/MST không đổi (gần như không xảy ra)
                if (retry == MaxRetries || snap.Value.CompanyName != request.CompanyName || snap.Value.TaxCode != request.TaxCode)
                    return ServiceResult<string>.Fail(ErrorCode.Conflict,
                        "Thông tin công ty vừa thay đổi, vui lòng tải lại danh sách và kiểm tra trước khi xác minh", ApiErrorCodes.EmployerProfileChanged);
                if (await _repo.VerifyAsync(userId, request.CompanyName!, request.TaxCode!)) return ServiceResult<string>.Success("Đã xác minh công ty");
            }
        }

        public async Task<ServiceResult<UnverifyResultDTO>> UnverifyAsync(string userId, UnverifyRequestDTO request)
        {
            var result = await UnverifyCoreAsync(userId, request);
            if (result.IsSuccess) await _cache.RemoveAsync(ProfileRoles.Employer, userId);
            return result;
        }

        private async Task<ServiceResult<UnverifyResultDTO>> UnverifyCoreAsync(string userId, UnverifyRequestDTO request)
        {
            // validation trước khi xem trạng thái
            var reason = request.Reason?.Trim();
            if (string.IsNullOrEmpty(reason))
                return ServiceResult<UnverifyResultDTO>.ValidationFail(new Dictionary<string, string[]> { ["reason"] = new[] { "Vui lòng nhập lý do" } });
            if (reason.Length > MaxReasonLength)
                return ServiceResult<UnverifyResultDTO>.ValidationFail(new Dictionary<string, string[]> { ["reason"] = new[] { $"Tối đa {MaxReasonLength} ký tự" } });

            // đọc trạng thái ngoài transaction: lệnh đầu tiên trong tx của repo phải là UPDATE lấy khóa ghi
            var state = await _repo.GetVerifyStateAsync(userId);
            if (state == null) return NotFound<UnverifyResultDTO>();
            // repo trả null = có người thu hồi xen giữa
            var closed = state == true ? await _repo.UnverifyAndCloseJobsAsync(userId, reason) : null;
            return ServiceResult<UnverifyResultDTO>.Success(closed == null
                ? new UnverifyResultDTO { Message = "Công ty đã bị thu hồi xác minh", ClosedJobCount = 0 }
                : new UnverifyResultDTO { Message = $"Đã thu hồi xác minh, đã đóng {closed} tin tuyển dụng", ClosedJobCount = closed.Value });
        }
    }
}
