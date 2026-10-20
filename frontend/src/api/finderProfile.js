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
                return "We couldn't find your profile."
            }
            case 409: {
                return "This information is already in use."
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