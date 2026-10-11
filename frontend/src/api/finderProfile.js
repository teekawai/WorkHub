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
    if (!err.response.status) {
        return "Cannot connect to server!"
    } else {
        var eStatus = err.response?.status
        switch (eStatus) {
            case 403: {
                return "You don't have access to this page."
            }
            case 404: {
                return "We couldn't find what you were looking for."
            }
            case 500: {
                return "The server is error."
            }
            default: {
                return "Error!"
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