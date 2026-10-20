import { Link } from "react-router-dom"
import { ROUTE_PATH } from "../../routes/route"

//empty state, chờ Module 4 (Application) có BE thì thay bằng danh sách đơn ứng tuyển
function FinderApplications() {
    return (
        <div className="max-w-4xl">
            <p className="text-xs font-medium uppercase tracking-wider text-[#155DFC]">Applications</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Applied Jobs</h1>
            <p className="mt-2 text-slate-500">Track the status of every application you send.</p>

            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-slate-900">No applications yet</h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Jobs you apply for will appear here with their latest status.</p>
                <Link
                    to={ROUTE_PATH.FINDER.HOME}
                    className="mt-6 rounded-xl bg-[#155DFC] px-5 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:bg-[#0F4FE0]"
                >
                    Browse jobs
                </Link>
            </div>
        </div>
    )
}

export default FinderApplications
