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
        return "Cannot connect to the server. Please check your connection."
    } else {
        var eStatus = err.response?.status
        switch (eStatus) {
            case 400: {
                return "Some information is invalid. Please check and try again."
            }
            case 403: {
                return "You don't have access to this page."
            }
            case 404: {
                return "We couldn't find your company profile."
            }
            case 409: {
                return "This company name or tax code is already in use."
            }
            case 413: {
                return "The file is too large."
            }
            case 500: {
                return "Something went wrong on our side. Please try again later."
            }
            default: {
                return "Something went wrong. Please try again."
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
