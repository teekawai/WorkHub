import axios from "axios"

//client "trơn": KHÔNG có interceptor nào.
//dùng cho các api không được đi qua cơ chế tự gắn token / tự refresh khi gặp 401: register, login, refresh.
//(nếu đi qua interceptor thì login sai mật khẩu hoặc refresh hết hạn đều bị coi là "token hết hạn" rồi gọi refresh lặp lại)
//withCredentials: true để cookie refreshToken được gửi đi và nhận về

export const API_URL = "http://localhost:5165/api"

const publicClient = axios.create({
    baseURL : API_URL,
    withCredentials : true
})

export default publicClient
