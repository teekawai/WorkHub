import axios from "axios";
import validateLogin from "../utils/LoginValidate";
import { loginUser } from "../api/auth";
import { data, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import auth_banner1 from "../assets/auth_banner1.png"
import {ROUTE_PATH} from "../routes/route"

function Login({ setCurrentUser }) {
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
            setCurrentUser(currentUser)
            navigate(currentUser.role =="finder" ? ROUTE_PATH.FINDER.HOME : ROUTE_PATH.EMPLOYER.HOME)
        } catch(e){
            setError("Đăng nhập thất bại: " + e.response?.data?.message)
        } finally{
            setLoading(false)
        }
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] min-h-[100dvh] overflow-hidden bg-[#FAFAF8]">
            <div className="h-[100dvh] overflow-y-auto px-6 sm:px-10 md:px-16 lg:px-24 xl:px-28 py-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="form">
                <div className="w-full max-w-md mx-auto md:mx-0">
                    {/* Logo */}
                    <div id="logo">
                        <a href="#" className="inline-flex items-center gap-0.5 no-underline text-xl font-bold tracking-tight">
                            <span className="bg-[#155DFC] text-white rounded-[10px] px-2.5 py-1">Work</span>
                            <span className="text-[#155DFC] px-0.5">Hub</span>
                        </a>
                    </div>

                    <div id="slogan" className="mt-10">
                        
                        <h3 className="mt-4 text-[28px] sm:text-3xl font-semibold text-[#111827] tracking-tight leading-tight">
                            Chào mừng quay trở lại
                        </h3>
                        <p className="mt-2 text-[15px] text-[#6B7280] leading-relaxed">
                            Đăng nhập để tiếp tục với sự nghiệp của bạn, hoặc tìm ứng viên phù hợp cho công ty.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="mt-8" noValidate>
                        <div>
                            <label htmlFor="email" className="text-[13px] font-medium text-[#374151]">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 text-[15px] mt-1.5 bg-white border border-[#E5E7EB] rounded-xl px-3.5 placeholder:text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#155DFC] focus:ring-4 focus:ring-[#155DFC]/10"
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </div>

                        <div className="mt-4">
                            <label htmlFor="password" className="text-[13px] font-medium text-[#374151]">Mật khẩu</label>
                            <div className="relative mt-1.5">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 text-[15px] bg-white border border-[#E5E7EB] rounded-xl px-3.5 pr-11 placeholder:text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#155DFC] focus:ring-4 focus:ring-[#155DFC]/10"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#155DFC] transition-colors duration-200"
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.4 18.4 0 0 1 4.22-5.36M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <label htmlFor="rememberMe" className="inline-flex items-center gap-2 text-[13.5px] text-[#4B5563] cursor-pointer select-none">
                                <input
                                    id="rememberMe"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded-[5px] border-[#D1D5DB] text-[#155DFC] focus:ring-2 focus:ring-[#155DFC]/20 accent-[#155DFC]"
                                />
                                Nhớ mật khẩu
                            </label>
                        </div>

                        {error && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <p className="text-[13px] text-red-700 leading-snug">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full h-11 mt-6 text-[15px] font-medium rounded-xl bg-[#155DFC] text-white overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0F4FE0] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 shadow-[0_1px_2px_rgba(21,93,252,0.3)]"
                        >
                            {loading ? "Đang xử lý..." : "Đăng nhập"}
                        </button>

                        <p className="text-[13.5px] text-[#6B7280] mt-5 text-center">
                            Chưa có tài khoản?{" "}
                            <Link to={ROUTE_PATH.AUTH.REGISTER} className="text-[#155DFC] font-medium hover:underline underline-offset-2">
                                Đăng ký
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            <div id="banner" className="hidden md:block relative h-[100dvh] overflow-hidden p-3">
                <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden ring-1 ring-black/5">
                    <img src={auth_banner1} alt="Sinh viên tìm việc trên WorkHub" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B3A]/70 via-[#0B1B3A]/10 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                        <p className="text-white text-[15px] leading-relaxed">
                            “Ứng tuyển thực tập chỉ mất 5 phút — hồ sơ của mình được nhà tuyển dụng phản hồi ngay trong tuần.”
                        </p>
                        <p className="mt-3 text-[13px] text-white/70">Sinh viên năm 3, Đại học Bách Khoa</p>
                    </div>
                </div>
            </div>
        </div>
    )

}
export default Login