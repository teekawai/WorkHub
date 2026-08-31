import axios from "axios"
import { refreshToken } from "./auth"

//file này là để tạo ra 1 cái interceptor để đỡ bị lặp code
//dùng khi cần check người dùng đăng nhập chưa, là 1 request interceptor
// khi gọi api bằng axios, thì thằng interceptor request này sẽ chặn lại, 
// xử lí nếu đã có người dùng đang đăng nhập rồi thì sẽ thêm header authorization là thằng bearer kia(jwt package)

const instance = axios.create({
    baseURL : "http://localhost:5165/api",
    withCredentials : true
})


instance.interceptors.request.use((config)=>{
    const currentUser = JSON.parse(localStorage.getItem("currentUser"))
    if(currentUser?.accessToken){
        config.headers.Authorization = `Bearer ${currentUser.accessToken}`
    }
    return config
})

instance.interceptors.response.use(
    response => response,
    async (error) =>{
        const currentUser = JSON.parse(localStorage.getItem("currentUser"))
        if(error.response?.status ===401 && !error.config._retry){
            error.config._retry =true //đánh dấu lại để tránh gọi api vô hạn, nếu gặp lỗi lại sẽ bay luôn ra ngoài
            try{
                const res = await refreshToken()
                currentUser.accessToken =res.accessToken //gọi refresh token
                localStorage.setItem("currentUser", JSON.stringify(currentUser)) //set lại access token cho current user vào lưu vào local
                error.config.headers.Authorization = `Bearer ${res.accessToken}` //gọi lại instance với access token mới
                return instance(error.config)
            } catch(eRefresh){
                localStorage.removeItem("currentUser")
                window.location.href = "/login"
                return Promise.reject(eRefresh)
            }
        }
        return Promise.reject(error)//không phải lỗi 401 thì trả về lỗi
    }
)
export default instance