import "../css/navbar.css"
import { Link, useNavigate } from "react-router-dom"
import { ROUTE_PATH } from "../routes/route"
import { logout } from "../api/auth"
import defaultAvatar from "../assets/avt-macdinh.webp"

function NavBar({ currentUser }) {
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await logout()
        } catch (e) {
            console.error(e)
        } finally {
            localStorage.removeItem("currentUser")
            navigate(ROUTE_PATH.AUTH.LOGIN)
        }
    }

    return (
        <nav className="h-20 bg-blue-600 flex justify-between items-center">
            <div id="logo" className="flex h-full w-fit pl-10  items-center justify-center">
                <a href="#" className="no-underline text-xl font-black">
                    <span className="bg-white p-1 text-blue-600 rounded-lg px-2">Work</span> <span className="bg-blue-600 text-white">Hub</span>
                </a>
            </div>
            {currentUser.role =="finder" ?<div id="menu-item" className="text-white text-sm flex justify-center gap-10">
                <a href="#" className="">Tìm việc làm</a>
                <a href="#">Việc đã ứng tuyển</a>
            </div>: <div id="menu-item" className="text-white text-sm flex justify-center gap-10">
                <a href="#" className="">Đăng tin tuyển dụng</a>
                <a href="#">Các tin đã đăng</a>
                <a href="#">Xem ứng viên</a>
            </div>
            }
            
            {currentUser ?
                <div id="button" className="group relative pr-10 flex items-center">
                    <div className="flex items-center gap-2 h-9 pl-4 pr-1 rounded-full bg-white/90 group-hover:bg-white transition-colors duration-200 ease-out cursor-pointer select-none shadow-sm">
                        <span className="text-xs text-blue-700 font-medium whitespace-nowrap">
                            Chào mừng, <span className="font-semibold">{currentUser.username}</span>
                        </span>
                        <img
                            src={currentUser.avatar || defaultAvatar}
                            alt="avatar"
                            className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                    </div>
                    <div className="absolute right-10 top-full pt-2 w-[150px] pointer-events-none group-hover:pointer-events-auto">
                        <div
                            id="drop-down-menu"
                            className="bg-white rounded-lg shadow-lg flex flex-col z-20 overflow-hidden origin-top transition-all duration-300 ease-out opacity-0 -translate-y-2 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto"
                        >
                            {currentUser.role === "finder"
                                ? <Link to={ROUTE_PATH.FINDER.PROFILE} className="px-3 py-2 text-xs hover:bg-gray-100 transition-colors duration-150">Hồ sơ cá nhân</Link>
                                : <Link to={ROUTE_PATH.EMPLOYER.PROFILE} className="px-3 py-2 text-xs hover:bg-gray-100 transition-colors duration-150">Hồ sơ nhà tuyển dụng</Link>}
                            <button onClick={handleLogout} className="px-3 py-2 text-xs text-left hover:bg-gray-100 transition-colors duration-150">Đăng xuất</button>
                        </div>
                    </div>
                </div> :
                <div className="flex gap-2 items-center pr-10">
                    <Link
                        to={ROUTE_PATH.AUTH.LOGIN}
                        className="px-3 py-1 text-xs font-semibold bg-white text-blue-600 rounded-full shadow-sm transition-colors duration-200 ease-out hover:bg-gray-200 active:scale-95"
                    >
                        Đăng nhập
                    </Link>
                    <Link
                        to={ROUTE_PATH.AUTH.REGISTER}
                        className="px-3 py-1 text-xs font-medium text-white/90 rounded-full transition-colors duration-200 ease-out hover:bg-white/15 hover:text-white active:scale-95"
                    >
                        Đăng ký
                    </Link>
                </div>
            }
        </nav>
    )
}

export default NavBar
