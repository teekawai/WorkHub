import instance from "./instance";

export const getFinderProfile = async () => {
    try {
        const profile = await instance.get("/finders/me")
        return profile.data
    } catch (e) {
        if (e.response?.status == 404) {
            return null
        }
        throw e
    }
}

//helper status code of getProfile
export const getProfileMsg = (err) => {
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
                return "Không tìm thấy hồ sơ của bạn."
            }
            case 409: {
                return "Thông tin này đã được sử dụng."
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

export const updateFinderProfile = (async (data) => {
        const res = await instance.put("/finders/me", data)
        return res.data
})

export const uploadAvatar = async (avt) => {
    const avatar = new FormData()
    avatar.append('avatar', avt)
    const res = await instance.post("/finders/me/avatar", avatar)
    return res.data
}

export const uploadCV = async (cv) => {
    const finderCV = new FormData()
    finderCV.append('cv', cv) //append(key, value): key phải trùng tên với tham số được truyền trong be
    const res = await instance.post("/finders/me/cv", finderCV)
    return res.data
}