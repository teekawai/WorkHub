import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { adminLogin, getAdminErrorMsg, getFieldError, getRetryAfterSeconds } from "../../api/admin"
import { useAuth } from "../../context/useAuth"
import { ROUTE_PATH } from "../../routes/route"
import homeOf from "../../utils/homeOf"

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[15px] outline-none transition-all focus:border-[#155DFC] focus:ring-4 focus:ring-[#155DFC]/10"

const WarnIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)

//cổng đăng nhập riêng cho admin (Figma 9.0.1-9.0.3): không Google, không đăng ký, không "nhớ mật khẩu"
function AdminLogin() {
    const { currentUser, login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("") //banner đỏ (sai tài khoản / lỗi chung)
    const [wrongCreds, setWrongCreds] = useState(false) //401: thêm dòng phụ gợi ý theo Figma 9.0.2
    const [fieldErrors, setFieldErrors] = useState({}) //lỗi dưới từng ô
    const [lockMsg, setLockMsg] = useState("") //message BE khi bị khóa; rỗng = không khóa
    const [lockedUntil, setLockedUntil] = useState(0) //mốc ms, 0 = không có mốc đếm

    //hết Retry-After thì mở lại nút; dọn timer khi rời trang
    useEffect(() => {
        if (!lockedUntil) return
        const t = setTimeout(() => { setLockMsg(""); setLockedUntil(0) }, Math.max(0, lockedUntil - Date.now()))
        return () => clearTimeout(t)
    }, [lockedUntil])

    //đã đăng nhập: admin vào thẳng trang công ty, role khác về home của họ (không hiện form)
    if (currentUser) return <Navigate to={homeOf(currentUser.role)} replace />

    const locked = !!lockMsg

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading || locked) return
        const errs = {}
        if (!email.trim()) errs.email = "Bạn chưa nhập email!"
        if (!password) errs.password = "Bạn chưa nhập mật khẩu!"
        setFieldErrors(errs)
        if (Object.keys(errs).length) return
        setLoading(true)
        setError("")
        setWrongCreds(false)
        try {
            const data = await adminLogin({ email: email.trim(), password })
            login({ userId: data.userId, email: data.email, role: data.role, accessToken: data.accessToken })
            navigate(ROUTE_PATH.ADMIN.EMPLOYERS, { replace: true })
        } catch (err) {
            //không log err: err.config.data chứa mật khẩu
            const status = err.response?.status
            const seconds = status === 429 ? getRetryAfterSeconds(err) : null
            if (seconds) {
                setLockMsg(getAdminErrorMsg(err))
                setLockedUntil(Date.now() + seconds * 1000)
            } else if (status === 400 && (getFieldError(err, "email") || getFieldError(err, "password"))) {
                setFieldErrors({ email: getFieldError(err, "email"), password: getFieldError(err, "password") })
            } else {
                setError(getAdminErrorMsg(err)) //giữ nguyên email, chỉ báo lỗi
                setWrongCreds(status === 401)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-[375px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="inline-flex items-center gap-0.5 text-xl font-bold tracking-tight">
                    <span className="rounded-[10px] bg-[#155DFC] px-2.5 py-1 text-white">Work</span>
                    <span className="px-0.5 text-[#155DFC]">Hub</span>
                </div>
                <p className="mt-6 text-[11px] font-medium uppercase tracking-wider text-[#155DFC]">Quản trị</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">Đăng nhập quản trị</h1>
                <p className="mt-1 text-[13px] text-[#6B7280]">Chỉ dành cho tài khoản quản trị viên WorkHub.</p>

                <form onSubmit={handleSubmit} className="mt-6" noValidate>
                    {locked && (
                        <div role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                            <p className="flex items-center gap-1.5 font-medium"><WarnIcon />Tạm khóa đăng nhập</p>
                            <p className="leading-snug">{lockMsg}</p>
                        </div>
                    )}
                    {error && (
                        <div role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[13px] leading-snug text-red-700">
                            <p className="flex items-center gap-1.5 font-medium"><WarnIcon />{error}</p>
                            {wrongCreds && <p>Kiểm tra lại email và mật khẩu rồi thử lại.</p>}
                        </div>
                    )}

                    <label htmlFor="admin-email" className="text-[13px] font-medium text-[#374151]">Email</label>
                    <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "admin-email-err" : undefined} placeholder="you@example.com" className={inputClass} />
                    {fieldErrors.email && <p id="admin-email-err" className="mt-1 text-[12.5px] text-red-600">{fieldErrors.email}</p>}

                    <label htmlFor="admin-password" className="mt-4 block text-[13px] font-medium text-[#374151]">Mật khẩu</label>
                    <div className="relative">
                        <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "admin-password-err" : undefined} placeholder="••••••••" className={`${inputClass} pr-16`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-[12px] text-slate-500 hover:text-[#155DFC]">
                            {showPassword ? "Ẩn" : "Hiện"}
                        </button>
                    </div>
                    {fieldErrors.password && <p id="admin-password-err" className="mt-1 text-[12.5px] text-red-600">{fieldErrors.password}</p>}

                    <button type="submit" disabled={loading || locked} className="mt-5 h-11 w-full rounded-xl bg-[#155DFC] text-[15px] font-medium text-white transition-colors hover:bg-[#0F4FE0] disabled:cursor-not-allowed disabled:opacity-60">
                        {loading ? "Đang xử lý..." : "Đăng nhập"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AdminLogin
