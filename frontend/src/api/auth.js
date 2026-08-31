import instance from "./instance"

//api của phần auth gồm có đăng ký, đăng nhập, refresh token

export const getRegisterUser = (async (data)=>{
    const res = await instance.post("/auth/register",data)
    return res.data
})

export const loginUser = (async (data)=>{
    const res = await instance.post("/auth/login", data)
    return res.data
})

export const refreshToken =(async (data)=>{
    const res = await instance.post("/auth/refresh")
    return res.data
})

export const logout = (async()=>{
    const res = await instance.post("/auth/logout")
    return res.data   
})