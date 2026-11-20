//Hàm thuần cho trang Admin "Công ty": dựng query, kiểm lý do thu hồi, gộp snapshot panel, lọc link website.
const TAB_VERIFIED = { all: undefined, verified: true, unverified: false }
export const REASON_MAX = 500

//Không gửi limit (BE mặc định 30). isVerified=false vẫn gửi; tab Tất cả thì bỏ key.
export function buildQuery({ keyword, tab, page }) {
    const query = { page }
    const word = keyword.trim()
    if (word) query.keyword = word
    if (TAB_VERIFIED[tab] !== undefined) query.isVerified = TAB_VERIFIED[tab]
    return query
}

//Đếm sau trim (khớp BE); không cắt ngầm khi quá dài.
export function validateReason(raw) {
    const count = raw.trim().length
    if (count === 0) return { ok: false, count, error: "Vui lòng nhập lý do" }
    if (count > REASON_MAX) return { ok: false, count, error: "Tối đa 500 ký tự" }
    return { ok: true, count, error: "" }
}

//Snapshot panel: item cùng userId trong list mới thì thay (để có tên/MST mới sau 409);
//rời list thì giữ snapshot, chỉ patch khi vừa verify/unverify đúng công ty đó (patch = null hoặc khác userId thì giữ nguyên).
export function mergeSelected(selected, items, patch, patchUserId) {
    if (!selected) return selected
    const fresh = items.find((item) => item.userId === selected.userId)
    if (fresh) return fresh
    return patch && selected.userId === patchUserId ? { ...selected, ...patch } : selected
}

//Website do Employer nhập: chỉ cho http/https để tránh link javascript:.
export function safeWebsite(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null
}
