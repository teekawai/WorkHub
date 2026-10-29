import axios from "axios"
import publicClient, { API_URL } from "./publicClient.js"

//file này là để tạo ra 1 cái interceptor để đỡ bị lặp code
//dùng khi cần check người dùng đăng nhập chưa, là 1 request interceptor
// khi gọi api bằng axios, thì thằng interceptor request này sẽ chặn lại, 
// xử lí nếu đã có người dùng đang đăng nhập rồi thì sẽ thêm header authorization là thằng bearer kia(jwt package)

const instance = axios.create({
    baseURL : API_URL,
    withCredentials : true,
    timeout: 15000 //15s, tránh request treo vô thời hạn khi server không phản hồi (vd: bị rate limiter giữ trong queue)
})

instance.interceptors.request.use((config)=>{
    const currentUser = JSON.parse(localStorage.getItem("currentUser"))
    if(currentUser?.accessToken){
        config.headers.Authorization = `Bearer ${currentUser.accessToken}`
    }
    return config
})

//single-flight: nếu nhiều request cùng dính 401 một lúc thì chỉ gọi /auth/refresh ĐÚNG 1 lần,
//các request còn lại chờ chung promise này. Tránh bắn nhiều refresh song song -> vượt rate limiter "auth" (429) -> bị đá ra login.
let refreshPromise = null

const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = publicClient.post("/auth/refresh") //dùng client trơn để không bị chính interceptor này chặn lại
            .then((res) => {
                const currentUser = JSON.parse(localStorage.getItem("currentUser"))
                if (currentUser) {
                    currentUser.accessToken = res.data.accessToken
                    localStorage.setItem("currentUser", JSON.stringify(currentUser)) //lưu access token mới vào local
                }
                return res.data.accessToken
            })
            .finally(() => {
                refreshPromise = null //xong (thành công hay lỗi) thì reset để lần hết hạn sau gọi refresh được tiếp
            })
    }
    return refreshPromise
}

instance.interceptors.response.use(
    response => response,
    async (error) =>{
        if(error.response?.status ===401 && !error.config._retry){
            error.config._retry =true //đánh dấu lại để tránh gọi api vô hạn, nếu gặp lỗi lại sẽ bay luôn ra ngoài
            try{
                const newAccessToken = await refreshAccessToken()
                error.config.headers.Authorization = `Bearer ${newAccessToken}` //gọi lại instance với access token mới
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
