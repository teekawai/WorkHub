// Map nhãn ngành ngắn của trang chủ -> tên ngành BE (lấy từ /jobs/options, FE không giữ danh sách ngành).
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Khớp nguyên từ bằng ranh giới Unicode (\b của JS chỉ hiểu ASCII nên hỏng với "Thiết kế", "Y tế").
// Chỉ nhận khi đúng 1 ngành khớp; không thấy hoặc mơ hồ -> null (không gửi category).
export const findBackCategory = (shortLabel, options) => {
    if (!shortLabel || !options?.categories) return null
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(shortLabel)}($|[^\\p{L}\\p{N}])`, "iu")
    const hits = options.categories.filter((cat) => re.test(cat.name))
    return hits.length === 1 ? hits[0].name : null
}
