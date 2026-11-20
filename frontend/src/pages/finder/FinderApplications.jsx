import { Link } from "react-router-dom"
import { ROUTE_PATH } from "../../routes/route"

//empty state, chờ Module 4 (Application) có BE thì thay bằng danh sách đơn ứng tuyển
function FinderApplications() {
    return (
        <div className="max-w-4xl">
            <p className="text-xs font-medium uppercase tracking-wider text-[#155DFC]">Đơn ứng tuyển</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Việc đã ứng tuyển</h1>
            <p className="mt-2 text-slate-500">Theo dõi trạng thái của mọi đơn ứng tuyển bạn đã gửi.</p>

            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-slate-900">Chưa có đơn ứng tuyển nào</h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Các việc làm bạn ứng tuyển sẽ hiển thị tại đây cùng trạng thái mới nhất.</p>
                <Link
                    to={ROUTE_PATH.FINDER.HOME}
                    className="mt-6 rounded-xl bg-[#155DFC] px-5 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:bg-[#0F4FE0]"
                >
                    Tìm việc làm
                </Link>
            </div>
        </div>
    )
}

export default FinderApplications
