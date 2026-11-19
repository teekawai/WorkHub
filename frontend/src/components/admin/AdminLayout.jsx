import { useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { logout as logoutApi } from "../../api/auth"
import { useAuth } from "../../context/useAuth"
import { ROUTE_PATH } from "../../routes/route"

//khung trang admin (Figma 9.1.2): sidebar + khối tài khoản/Đăng xuất ở đáy (admin không có NavBar)
function AdminLayout() {
    const { currentUser, logout } = useAuth()
    const navigate = useNavigate()
    const [loggingOut, setLoggingOut] = useState(false)

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await logoutApi() //hủy refresh token ở BE
        } catch {
            //lỗi mạng / token hết hạn vẫn đăng xuất phía FE
        }
        logout()
        navigate(ROUTE_PATH.ADMIN.LOGIN, { replace: true })
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
            <aside className="flex items-center border-b border-slate-200 bg-white p-4 md:w-64 md:shrink-0 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-5">
                <Link to={ROUTE_PATH.ADMIN.EMPLOYERS} className="inline-flex items-center gap-0.5 text-xl font-semibold tracking-tight no-underline">
                    <span className="rounded-[10px] bg-[#155DFC] px-2.5 py-1 text-white">Work</span>
                    <span className="px-0.5 text-[#155DFC]">Hub</span>
                </Link>

                <nav aria-label="Không gian quản trị" className="ml-4 flex items-center md:ml-0 md:mt-8 md:flex-col md:items-stretch md:gap-1.5">
                    <p className="hidden px-3 pb-1 text-xs font-medium uppercase tracking-wider text-slate-500 md:block">Không gian quản trị</p>
                    <NavLink
                        to={ROUTE_PATH.ADMIN.EMPLOYERS}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                                isActive ? "bg-blue-50 text-[#155DFC]" : "text-slate-600 hover:bg-slate-100"
                            }`
                        }
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 21h18" />
                            <path d="M5 21V7l8-4v18" />
                            <path d="M19 21V11l-6-4" />
                        </svg>
                        Công ty
                    </NavLink>
                </nav>

                <div className="ml-auto md:mt-auto md:border-t md:border-slate-200 md:pt-4">
                    <p className="hidden text-sm font-medium text-slate-900 md:block">Quản trị viên</p>
                    <p className="hidden truncate text-xs text-slate-500 md:block">{currentUser?.email}</p>
                    <button type="button" onClick={handleLogout} disabled={loggingOut} className="text-sm text-slate-600 hover:text-[#155DFC] disabled:opacity-60 md:mt-2">
                        {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1 p-5 md:p-9">
                <Outlet />
            </main>
        </div>
    )
}

export default AdminLayout
