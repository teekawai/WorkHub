import { Link, NavLink, Outlet } from "react-router-dom"
import { ROUTE_PATH } from "../../routes/route"

//khung chung cho các trang trong "Employer workspace": sidebar bên trái + nội dung (Outlet) bên phải
//copy cấu trúc từ FinderLayout.jsx — trên màn nhỏ sidebar nằm phía trên, các link xếp ngang
//My Jobs chưa có route thật (Module 3) nên tạm để "#", sẽ nối khi làm Module 3
const links = [
    {
        label: "Company Profile",
        to: ROUTE_PATH.EMPLOYER.PROFILE,
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
            </svg>
        ),
    },
    {
        label: "My Jobs",
        to: "#",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        ),
    },
]

function EmployerLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
            <aside className="border-b border-slate-200 bg-white p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-5">
                {/* logo bấm về trang chủ employer */}
                <Link to={ROUTE_PATH.EMPLOYER.HOME} className="inline-flex items-center gap-0.5 text-xl font-semibold tracking-tight no-underline">
                    <span className="rounded-[10px] bg-[#155DFC] px-2.5 py-1 text-white">Work</span>
                    <span className="px-0.5 text-[#155DFC]">Hub</span>
                </Link>

                <nav aria-label="Employer workspace" className="mt-4 flex flex-wrap gap-2 md:mt-8 md:flex-col md:flex-nowrap md:gap-1.5">
                    <p className="hidden px-3 pb-1 text-xs font-medium uppercase tracking-wider text-slate-500 md:block">Employer workspace</p>
                    {links.map((link) => (
                        <NavLink
                            key={link.label}
                            to={link.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                                    isActive ? "bg-blue-50 text-[#155DFC]" : "text-slate-600 hover:bg-slate-100"
                                }`
                            }
                        >
                            {link.icon}
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <main className="min-w-0 flex-1 p-5 md:p-9">
                <Outlet />
            </main>
        </div>
    )
}

export default EmployerLayout
