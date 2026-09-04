import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"
import { getRegisterUser } from "../api/auth";
import validate from "../utils/RegisterValidate";
import auth_banner1 from "../assets/auth_banner1.png"
import {ROUTE_PATH} from "../routes/route"

function Register() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState("finder")
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const navigate = useNavigate()

    const handleRegister = async (e) => {
        e.preventDefault()

        const validateError = validate({ username, email, password, role, agreeTerms })
        if (validateError != null) {
            setError(validateError)
            return
        }
        if (confirmPassword != password) {
            setError("Xác nhận mật khẩu chưa đúng, vui lòng thử lại!")
            return
        }

        setLoading(true)
        setError("")
        try {
            await getRegisterUser({ username, password, email, role })
            navigate(ROUTE_PATH.AUTH.LOGIN)
        } catch (e) {
            setError("Đăng kí thất bại: " + e.response?.data?.message)
        } finally {
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
                        <h3 className="text-[28px] sm:text-3xl font-semibold text-[#111827] tracking-tight leading-tight">
                            Tạo tài khoản
                        </h3>
                        <p className="mt-2 text-[15px] text-[#6B7280] leading-relaxed">
                            Tìm kiếm cơ hội việc làm hoặc tìm kiếm ứng viên sáng giá
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="mt-8" noValidate>
                        {/* Chọn role */}
                        <div id="role" className="grid grid-cols-2 gap-3">
                            <div
                                id="finder"
                                onClick={() => setRole("finder")}
                                className={
                                    role === "finder"
                                        ? "relative cursor-pointer rounded-xl p-3.5 bg-[#155DFC]/5 border border-[#155DFC]/30 ring-4 ring-[#155DFC]/10 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                                        : "relative cursor-pointer rounded-xl p-3.5 bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[#D1D5DB]"
                                }
                            >
                                {role === "finder" && (
                                    <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#155DFC] text-white">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                )}
                                <p className="text-xl">🎓</p>
                                <p className="mt-1 text-[14px] font-medium text-[#111827]">Người tìm việc</p>
                                <p className="hidden sm:block mt-0.5 text-[12.5px] text-[#6B7280] leading-snug">Tìm công việc phù hợp với bạn</p>
                            </div>

                            <div
                                id="employer"
                                onClick={() => setRole("employer")}
                                className={
                                    role === "employer"
                                        ? "relative cursor-pointer rounded-xl p-3.5 bg-[#155DFC]/5 border border-[#155DFC]/30 ring-4 ring-[#155DFC]/10 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                                        : "relative cursor-pointer rounded-xl p-3.5 bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[#D1D5DB]"
                                }
                            >
                                {role === "employer" && (
                                    <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#155DFC] text-white">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                )}
                                <p className="text-xl">🏢</p>
                                <p className="mt-1 text-[14px] font-medium text-[#111827]">Nhà tuyển dụng</p>
                                <p className="hidden sm:block mt-0.5 text-[12.5px] text-[#6B7280] leading-snug">Đăng tin và tìm ứng viên phù hợp</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <label htmlFor="username" className="text-[13px] font-medium text-[#374151]">
                                {role === "finder" ? "Họ tên" : "Họ tên nhà tuyển dụng"}
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full h-11 text-[15px] mt-1.5 bg-white border border-[#E5E7EB] rounded-xl px-3.5 placeholder:text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#155DFC] focus:ring-4 focus:ring-[#155DFC]/10"
                                placeholder="Nguyen Van A"
                                autoComplete="name"
                            />
                        </div>

                        <div className="mt-4">
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
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#155DFC] transition-colors duration-200"
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.4 18.4 0 0 1 4.22-5.36M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#374151]">Xác nhận mật khẩu</label>
                            <div className="relative mt-1.5">
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full h-11 text-[15px] bg-white border border-[#E5E7EB] rounded-xl px-3.5 pr-11 placeholder:text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#155DFC] focus:ring-4 focus:ring-[#155DFC]/10"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#155DFC] transition-colors duration-200"
                                >
                                    {showConfirm ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.4 18.4 0 0 1 4.22-5.36M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2">
                            <input
                                id="agreeTerms"
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded-[5px] border-[#D1D5DB] text-[#155DFC] focus:ring-2 focus:ring-[#155DFC]/20 accent-[#155DFC]"
                            />
                            <label htmlFor="agreeTerms" className="text-[13.5px] text-[#4B5563] leading-snug select-none">
                                Tôi đồng ý với <a href="#" className="text-[#155DFC] font-medium hover:underline underline-offset-2">Điều khoản dịch vụ</a> và <a href="#" className="text-[#155DFC] font-medium hover:underline underline-offset-2">Chính sách bảo mật</a>
                            </label>
                        </div>

                        {error && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                <p className="text-[13px] text-red-700 leading-snug">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full h-11 mt-6 text-[15px] font-medium rounded-xl bg-[#155DFC] text-white overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0F4FE0] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 shadow-[0_1px_2px_rgba(21,93,252,0.3)]"
                        >
                            {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                        </button>

                        <p className="text-[13.5px] text-[#6B7280] mt-5 text-center">
                            Đã có tài khoản?{" "}
                            <Link to={ROUTE_PATH.AUTH.LOGIN} className="text-[#155DFC] font-medium hover:underline underline-offset-2">
                                Đăng nhập
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            <div id="banner" className="hidden md:block relative h-[100dvh] overflow-hidden p-3">
                <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden ring-1 ring-black/5">
                    <img src={auth_banner1} alt="Kết nối ứng viên và nhà tuyển dụng trên WorkHub" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B3A]/70 via-[#0B1B3A]/10 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                        <p className="text-white text-[15px] leading-relaxed">
                            "Chỉ mất vài phút tạo hồ sơ, mình đã kết nối được với nhiều nhà tuyển dụng phù hợp trên WorkHub."
                        </p>
                        <p className="mt-3 text-[13px] text-white/70">Sinh viên năm 3, Đại học Bách Khoa</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
