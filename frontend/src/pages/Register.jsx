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
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] h-screen overflow-hidden">
            <div className="h-screen overflow-y-auto p-6 sm:p-10 md:px-16 lg:px-24 xl:px-32 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="form">
                {/* Logo và slogan */}
                <div id="logo">
                    <a href="#" className="no-underline text-2xl font-black">
                        <span className="bg-blue-600 p-1 text-white rounded-lg px-2">Work</span> <span className="bg-white text-blue-600">Hub</span>
                    </a>
                </div>

                <div id="slogan" className="mt-6">
                    <h3 className="text-2xl font-bold text-black ">Tạo tài khoản</h3>
                    <p className="text-gray-600">Tìm kiếm cơ hội việc làm hoặc tìm kiếm ứng viên sáng giá</p>
                </div>

                <form onSubmit={handleRegister}>
                    {/* Chọn role */}
                    <div id="role" className="grid grid-cols-2 gap-x-4 sm:gap-x-10 mt-10">
                        <div
                            id="finder"
                            className={role === "finder" ?
                                "border-2 border-blue-500 rounded-2xl p-3 bg-blue-50 transition-colors duration-200 cursor-pointer relative" :
                                "border-2 border-gray-300 rounded-2xl p-3 transition-colors duration-200 cursor-pointer relative"}
                            onClick={() => setRole("finder")}
                        >
                            {role === "finder" && (
                                <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">✓</span>
                            )}
                            <p className="text-2xl">🎓</p>
                            <p className="text-base text-blue-600 font-semibold">Người tìm việc</p>
                            <p className="hidden sm:block text-sm text-gray-500">Tìm công việc phù hợp cho sự nghiệp của bạn</p>
                        </div>

                        <div
                            id="employer"
                            className={role === "employer" ?
                                "border-2 border-blue-500 rounded-2xl p-3 bg-blue-50 transition-colors duration-200 cursor-pointer relative" :
                                "border-2 border-gray-300 rounded-2xl p-3 transition-colors duration-200 cursor-pointer relative"}
                            onClick={() => setRole("employer")}
                        >
                            {role === "employer" && (
                                <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">✓</span>
                            )}
                            <p className="text-2xl">🏢</p>
                            <p className="text-base text-blue-600 font-semibold">Nhà tuyển dụng</p>
                            <p className="hidden sm:block text-sm text-gray-500">Đăng công việc và kết nối tới ứng viên phù hợp</p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="username" className="font-semibold text-sm">{role == "finder" ? "Họ tên" : "Họ tên nhà tuyển dụng"}</label>
                        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} type="text" className="w-full h-10 text-base mt-2 border border-gray-300 rounded-md pl-2 placeholder:text-sm focus:outline-none focus:border-blue-500" placeholder="Nguyen Van A" />
                    </div>

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

                    <div className="mt-5">
                        <label htmlFor="confirmPassword" className="font-semibold text-sm">Xác nhận mật khẩu</label>
                        <div className="relative mt-2">
                            <input id="confirmPassword" type={showConfirm ? "text" : "password"}
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-10 text-base border border-gray-300 rounded-md pl-2 pr-14 placeholder:text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-blue-600">
                                {showConfirm ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2">
                        <input id="agreeTerms" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
                        <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                            Tôi đồng ý với <a href="#" className="text-blue-700 underline">Điều khoản dịch vụ</a> và <a href="#" className="text-blue-700 underline">Chính sách bảo mật</a>
                        </label>
                    </div>

                    {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                    <button type="submit" disabled={loading} className="w-full h-10 text-lg font-semibold rounded-md mt-5 bg-blue-600 text-white disabled:opacity-60 active:bg-blue-500">
                        {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                    </button>
                    
                    <p className="text-sm text-black mt-3 text-center">Đã có tài khoản? <Link to={ROUTE_PATH.AUTH.LOGIN} className="text-blue-700 underline">Đăng nhập</Link></p>
                </form>
            </div>
            <div id="banner" className="hidden md:block h-screen overflow-hidden p-3 bg-blue-100">
                <img src={auth_banner1} alt="" className="w-full h-full object-cover rounded-2xl" />
            </div>
        </div>
    )
}

export default Register
