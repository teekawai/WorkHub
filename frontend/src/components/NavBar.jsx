import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ROUTE_PATH } from "../routes/route"
import { logout } from "../api/auth"
import defaultAvatar from "../assets/avt-macdinh.webp"

function NavBar({ currentUser }) {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Đóng mobile menu khi resize lên desktop
    useEffect(() => {
        function handleResize() {
            if (window.innerWidth >= 768) setMenuOpen(false)
        }
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

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

    const finderLinks = [
        { label: "Tìm việc làm", to: "#" },
        { label: "Việc đã ứng tuyển", to: "#" },
    ]

    const employerLinks = [
        { label: "Đăng tin tuyển dụng", to: "#" },
        { label: "Tin đã đăng", to: "#" },
        { label: "Xem ứng viên", to: "#" },
    ]

    const navLinks = currentUser?.role === "employer" ? employerLinks : finderLinks

    return (
        <>
            <nav className="sticky top-0 z-50 bg-blue-600 shadow-md">
                <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-6">

                    {/* Logo */}
                    <Link
                        to={currentUser?.role === "finder" ? ROUTE_PATH.FINDER.HOME : ROUTE_PATH.EMPLOYER.HOME}
                        className="flex items-center gap-1 shrink-0 no-underline"
                    >
                        <span className="text-lg font-black text-blue-600 bg-white px-2 py-0.5 rounded-md leading-tight">Work</span>
                        <span className="text-lg font-black text-white">Hub</span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                to={link.to}
                                className="relative text-white/85 hover:text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors duration-150 no-underline"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                        {currentUser ? (
                            /* User dropdown */
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors duration-150 cursor-pointer border border-white/20"
                                >
                                    <span className="text-xs text-white font-medium hidden sm:block whitespace-nowrap">
                                        {currentUser.username}
                                    </span>
                                    <img
                                        src={currentUser.avatar || defaultAvatar}
                                        alt="avatar"
                                        className="w-6 h-6 rounded-full object-cover border border-white/40"
                                    />
                                    {/* Chevron */}
                                    <svg
                                        className={`w-3 h-3 text-white/70 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg overflow-hidden z-50 border border-gray-100">
                                        <div className="px-3 py-2 border-b border-gray-100">
                                            <p className="text-xs text-gray-400">Đăng nhập với tư cách</p>
                                            <p className="text-xs font-semibold text-gray-700 capitalize">{currentUser.role}</p>
                                        </div>
                                        {currentUser.role === "finder"
                                            ? <Link to={ROUTE_PATH.FINDER.PROFILE} onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors no-underline">Hồ sơ cá nhân</Link>
                                            : <Link to={ROUTE_PATH.EMPLOYER.PROFILE} onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors no-underline">Hồ sơ công ty</Link>
                                        }
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Auth buttons */
                            <div className="flex items-center gap-2">
                                <Link to={ROUTE_PATH.AUTH.LOGIN} className="px-3 py-1.5 text-sm font-semibold bg-white text-blue-600 rounded-full hover:bg-gray-100 transition-colors no-underline">
                                    Đăng nhập
                                </Link>
                                <Link to={ROUTE_PATH.AUTH.REGISTER} className="px-3 py-1.5 text-sm font-medium text-white/90 rounded-full hover:bg-white/15 hover:text-white transition-colors no-underline">
                                    Đăng ký
                                </Link>
                            </div>
                        )}

                        {/* Hamburger — mobile only */}
                        <button
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/15 transition-colors text-white"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle menu"
                        >
                            {menuOpen ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-white/20 flex justify-end">
                        <div className="w-1/3 bg-white shadow-lg rounded-bl-xl py-2 flex flex-col">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.to}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm text-gray-700 font-medium py-2 px-4 hover:bg-blue-50 hover:text-blue-600 transition-colors no-underline"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>
        </>
    )
}

export default NavBar
