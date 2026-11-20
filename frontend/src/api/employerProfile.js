import instance from "./instance.js";

//Shape dữ liệu EmployerProfile trả về từ GET /employer/me (khớp EmployerProfileResDTO):
//{ companyName, logo, address, description, website, field, foundedYear, email, phone, taxCode }
//Lưu ý: route BE thật là số ít "/employer" (không phải "/employers" như tài liệu API ghi).

export const getEmployerProfile = async () => {
    try {
        const profile = await instance.get("/employer/me")
        return profile.data
    } catch (e) {
        if (e.response?.status == 404) {
            return null
        }
        throw e
    }
}

//helper status code, copy từ getProfileMsg (finder) + chỉnh câu 409 cho đúng ngữ cảnh companyName/taxCode
export const getEmployerProfileMsg = (err) => {
    if (!err.response) {
        return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng."
    } else {
        var eStatus = err.response?.status
        switch (eStatus) {
            case 400: {
                return "Một số thông tin không hợp lệ. Vui lòng kiểm tra và thử lại."
            }
            case 403: {
                return "Bạn không có quyền truy cập trang này."
            }
            case 404: {
                return "Không tìm thấy hồ sơ công ty của bạn."
            }
            case 409: {
                return "Tên công ty hoặc mã số thuế này đã được sử dụng."
            }
            case 413: {
                return "Tệp quá lớn."
            }
            case 429: {
                return "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại."
            }
            case 500: {
                return "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
            }
            default: {
                return "Đã có lỗi xảy ra. Vui lòng thử lại."
            }
        }
    }
}

export const updateEmployerProfile = (async (data) => {
    const res = await instance.put("/employer/me", data)
    return res.data
})

//BE nhận file qua IFormFile tên tham số "avatar" dù endpoint là /me/logo -> key FormData phải là "avatar"
export const uploadLogo = async (logo) => {
    const form = new FormData()
    form.append("avatar", logo)
    const res = await instance.post("/employer/me/logo", form)
    return res.data
}
