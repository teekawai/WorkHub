import instance from "./instance"
import publicClient from "./publicClient"

//register, login, refresh dùng publicClient (không interceptor)
//logout dùng instance vì BE yêu cầu có token

//api của phần auth gồm có đăng ký, đăng nhập, refresh token

export const getRegisterUser = (async (data)=>{
    const res = await publicClient.post("/auth/register",data)
    return res.data
})

export const loginUser = (async (data)=>{
    const res = await publicClient.post("/auth/login", data)
    return res.data
})

export const refreshToken =(async (data)=>{
    const res = await publicClient.post("/auth/refresh")
    return res.data
})

export const logout = (async()=>{
    const res = await instance.post("/auth/logout")
    return res.data   
})