import axios from "axios";
import validateLogin from "../utils/LoginValidate";
import { loginUser } from "../api/auth";
import { data, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import auth_banner1 from "../assets/auth_banner1.png"
import {ROUTE_PATH} from "../routes/route"

function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()
    const handleLogin = async (e) => {
        e.preventDefault()
        const validate = validateLogin({ email, password })
        if (validate != null) {
            setError(validate)
            return
        } 
        setLoading(true)
        setError("")

        try {
            const data = await loginUser({email, password, rememberMe})
            const currentUser = {
                userId : data.userId,
                username: data.username,
                role : data.role,
                accessToken : data.accessToken
            }
            localStorage.setItem("currentUser", JSON.stringify(currentUser))

            navigate(currentUser.role =="finder" ? ROUTE_PATH.FINDER.HOME : ROUTE_PATH.EMPLOYER.HOME)
        } catch(e){
            setError("Đăng nhập thất bại: " + e.response?.data?.message)
        } finally{
            setLoading(false)
        }
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] h-screen overflow-hidden">
            <div className="h-screen overflow-y-auto p-6 sm:p-10 md:px-16 lg:px-24 xl:px-32 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="form">
                {/* Logo và slogan */}
                <div id="logo">
                    <a href="#" className="no-underline text-2xl font-black">
                        <span className="bg-blue-600 p-1 text-white rounded-lg px-2">Work</span> <span className="bg-white text-blue-600">Hub</span>
                    </a>
                </div>

                <div id="slogan" className="mt-6">
                    <h3 className="text-2xl font-bold text-black ">Chào mừng quay trở lại</h3>
                    <p className="text-gray-600">Hãy đăng nhập để tiếp tục với sự nghiệp của bạn hoặc tìm kiếm ứng viên phù hợp với công ty của bạn</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="mt-5">
                        <label htmlFor="email" className="font-semibold text-sm">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 text-base mt-2 border border-gray-300 rounded-md pl-2 placeholder:text-sm focus:outline-none focus:border-blue-500" placeholder="you@example.com" />
                    </div>

                    <div className="mt-5">
                        <label htmlFor="password" className="font-semibold text-sm">Mật khẩu</label>
                        <div className="relative mt-2">
                            <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 text-base border border-gray-300 rounded-md pl-2 pr-14 placeholder:text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-blue-600">
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2">
                        <input id="rememberMe" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mt-1" />
                        <label htmlFor="rememberMe" className="text-sm text-gray-700">Nhớ mật khẩu</label>
                    </div>
                    {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                    <button type="submit" disabled={loading} className="w-full h-10 text-lg font-semibold rounded-md mt-5 bg-blue-600 text-white disabled:opacity-60">
                        {loading ? "Đang xử lý..." : "Đăng nhập"}
                    </button>
                    
                    <p className="text-sm text-black mt-3 text-center">Chưa có tài khoản? <Link to={ROUTE_PATH.AUTH.REGISTER} className="text-blue-700 underline">Đăng ký</Link></p>
                </form>
            </div>
            <div id="banner" className="hidden md:block h-screen overflow-hidden p-3 bg-blue-100">
                <img src={auth_banner1} alt="" className="w-full h-full object-cover rounded-2xl" />
            </div>
        </div>
    )

}
export default Login