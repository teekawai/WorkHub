import instance from "./instance.js"
import publicClient from "./publicClient.js"

//Admin API (PLAN_Admin 3). Mọi hàm trả data, lỗi axios để caller catch.

//login admin dùng client trơn: không interceptor refresh (HANDOFF M-7), 401 là sai tài khoản chứ không phải hết phiên
//timeout riêng 15s (publicClient chung không có): BE treo thì timeout không có response -> getAdminErrorMsg trả câu kết nối
export const adminLogin = async ({ email, password }) => {
    const res = await publicClient.post("/admin/login", { email, password }, { timeout: 15000 })
    return res.data //{ accessToken, email, userId, role }
}

//bỏ undefined / "" nhưng giữ false (isVerified=false = tab "Chưa xác minh")
export const cleanParams = (params) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))

//{ keyword, isVerified, page } -> { items, pagination }; không gửi limit (BE mặc định 30)
export const getEmployers = async (params = {}) => {
    const res = await instance.get("/admin/employers", { params: cleanParams(params) })
    return res.data
}

//companyName, taxCode gửi nguyên văn từ GET (không trim) để BE phát hiện hồ sơ vừa đổi -> 409
export const verifyEmployer = async (userId, { companyName, taxCode }) => {
    const res = await instance.patch(`/admin/employers/${userId}/verify`, { companyName, taxCode })
    return res.data //{ message }
}

export const unverifyEmployer = async (userId, reason) => {
    const res = await instance.patch(`/admin/employers/${userId}/unverify`, { reason })
    return res.data //{ message, closedJobCount }
}

const STATUS_MSG = {
    404: "Không tìm thấy công ty.",
    500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
    503: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
}

//BE trả message tiếng Việt -> dùng nguyên, kể cả 429 (có số phút khóa)
export const getAdminErrorMsg = (err) => {
    if (!err.response) return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng."
    const { status, data } = err.response
    return data?.message || STATUS_MSG[status] || "Đã có lỗi xảy ra. Vui lòng thử lại."
}

export const getAdminErrorCode = (err) => err.response?.data?.code

//400 VALIDATION_ERROR: errors là map field -> mảng câu lỗi
export const getFieldError = (err, field) => err.response?.data?.errors?.[field]?.[0]

//số giây khóa từ header Retry-After; thiếu / <= 0 / không phải số -> null (không khóa nút)
export const getRetryAfterSeconds = (err) => {
    const s = Number.parseInt(err.response?.headers?.["retry-after"], 10)
    return s > 0 ? s : null
}
