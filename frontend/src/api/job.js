import instance from "./instance.js"
import publicClient from "./publicClient.js"

//Phần Employer của Job API (Business 7). Phần public (searchJobs, getJobById) ở cuối nhóm public bên dưới.

//public, không cần token -> client trơn
export const getJobOptions = async () => {
    const res = await publicClient.get("/jobs/options")
    return res.data //{ categories: [{ name, subCategories }], locations, workTypes }
}

//public: tìm việc. params dựng bằng toApiParams; signal để huỷ request cũ. Trả { items, pagination }
export const searchJobs = async (params, signal) => {
    const res = await publicClient.get("/jobs", { params, signal })
    return res.data
}

//public: chi tiết 1 tin (404 trung tính cho mọi trường hợp không xem được).
//Dùng instance để gửi kèm token khi đã đăng nhập: Finder nhận thêm hasApplied; khách không có token vẫn gọi được
export const getJobById = async (id) => {
    const res = await instance.get(`/jobs/${encodeURIComponent(id)}`)
    return res.data
}

//{ items, pagination }, BE mặc định limit 30
export const getMyJobs = async (page = 1) => {
    const res = await instance.get("/employer/jobs", { params: { page } })
    return res.data
}

export const getMyJobById = async (id) => {
    const res = await instance.get(`/employer/jobs/${id}`)
    return res.data
}

//idempotencyKey sinh 1 lần khi mở form, gửi lại cùng form thì giữ nguyên key (Business 7)
export const createJob = async (body, idempotencyKey) => {
    const res = await instance.post("/jobs", body, { headers: { "Idempotency-Key": idempotencyKey } })
    return res.data
}

export const updateJob = async (id, body) => {
    const res = await instance.put(`/jobs/${id}`, body)
    return res.data
}

//BE chỉ nhận "Closed" (Business 2.4)
export const closeJob = async (id) => {
    const res = await instance.patch(`/jobs/${id}/status`, { status: "Closed" })
    return res.data
}

export const deleteJob = async (id) => {
    const res = await instance.delete(`/jobs/${id}`)
    return res.data //{ message: "Đã xóa tin tuyển dụng" }
}

const STATUS_MSG = {
    404: "Không tìm thấy tin tuyển dụng.",
    500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
}

//BE trả message tiếng Việt -> dùng nguyên; 429 luôn dùng câu user chốt
export const getJobErrorMsg = (err) => {
    if (!err.response) return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng."
    const { status, data } = err.response
    if (status === 429) return "Bạn thao tác quá nhanh, vui lòng thử lại sau."
    return data?.message || STATUS_MSG[status] || "Đã có lỗi xảy ra. Vui lòng thử lại."
}
