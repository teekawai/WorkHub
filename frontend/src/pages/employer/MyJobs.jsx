import { useEffect, useRef, useState } from "react"
import { Link, generatePath, useNavigate } from "react-router-dom"
import useMyJobs from "../../hooks/useMyJobs"
import Button from "../../components/shared/Button"
import ConfirmDialog from "../../components/shared/ConfirmDialog"
import VerifyStatusBanner from "../../components/employer/job/VerifyStatusBanner"
import { ROUTE_PATH } from "../../routes/route"
import { BADGE_CLASS, CLOSE_DIALOG, DELETE_DIALOG } from "../../components/employer/job/jobUi"
import { formatDateVn, formatDeadline, formatSalary, jobStatusLabel, workTypeLabel } from "../../utils/jobFormat"
import { pageWindow } from "../../utils/pagination"

const LOCK_NOTE = "Cần xác minh công ty để đăng tin."
const TEXT_ACTION = "rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"

const jobPath = (pattern, job) => generatePath(pattern, { id: job.jobId })

//Menu "..." của 1 hàng: Xem chi tiết + Xóa. Đóng bằng Esc hoặc click ngoài.
function RowMenu({ job, busy, onDelete }) {
    const [open, setOpen] = useState(false)
    const boxRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const onKey = (event) => event.key === "Escape" && setOpen(false)
        const onClick = (event) => !boxRef.current?.contains(event.target) && setOpen(false)
        window.addEventListener("keydown", onKey)
        window.addEventListener("mousedown", onClick)
        return () => {
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("mousedown", onClick)
        }
    }, [open])

    return (
        <div ref={boxRef} className="relative">
            <button
                type="button"
                aria-label={`Thêm thao tác cho ${job.jobTitle}`}
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={busy}
                onClick={() => setOpen((value) => !value)}
                className={`${TEXT_ACTION} tracking-widest`}
            >
                ...
            </button>
            {open && (
                <div role="menu" className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <Link role="menuitem" to={jobPath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, job)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                        Xem chi tiết
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            onDelete(job)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                        Xóa
                    </button>
                </div>
            )}
        </div>
    )
}

function JobRow({ job, isVerified, busy, onClose, onDelete }) {
    const navigate = useNavigate()
    const label = jobStatusLabel(job) //hành động quyết theo nhãn, không theo job.status (tin Open quá hạn = Hết hạn)
    const isOpen = label === "Đang mở"
    return (
        <tr className="group border-t border-slate-100 hover:bg-slate-50">
            <td className="px-6 py-4">
                <Link to={jobPath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, job)} className="font-semibold text-slate-900 hover:text-[#155DFC] [overflow-wrap:anywhere]">
                    {job.jobTitle}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                    {job.location} · {workTypeLabel(job.workType)} · Đăng {formatDateVn(job.createdAt)}
                </p>
            </td>
            <td className="px-4 py-4 text-sm text-slate-700">{formatSalary(job)}</td>
            <td className="px-4 py-4 text-sm text-slate-700">{formatDeadline(job.deadline)}</td>
            <td className="px-4 py-4">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[label]}`}>{label}</span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                    {!isVerified && (
                        <Link to={jobPath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, job)} className={TEXT_ACTION}>
                            Xem
                        </Link>
                    )}
                    {isVerified && isOpen && (
                        <>
                            <button type="button" disabled={busy} onClick={() => navigate(jobPath(ROUTE_PATH.EMPLOYER.JOB_EDIT, job), { state: { from: "list" } })} className={TEXT_ACTION}>
                                Sửa
                            </button>
                            <button type="button" disabled={busy} onClick={() => onClose(job)} className={TEXT_ACTION}>
                                Đóng tin
                            </button>
                        </>
                    )}
                    {isVerified && !isOpen && (
                        <button type="button" disabled={busy} onClick={() => navigate(jobPath(ROUTE_PATH.EMPLOYER.JOB_REPOST, job), { state: { from: "list" } })} className={TEXT_ACTION}>
                            Đăng lại
                        </button>
                    )}
                    {isVerified && <RowMenu job={job} busy={busy} onDelete={onDelete} />}
                </div>
            </td>
        </tr>
    )
}

function MyJobs() {
    const navigate = useNavigate()
    const {
        jobs, pagination, page, setPage, status, errorMsg, retry,
        isVerified, unverifyReason, profileFailed,
        confirm, busyId, askClose, askDelete, cancelConfirm, doConfirm,
    } = useMyJobs()

    const goNew = () => navigate(ROUTE_PATH.EMPLOYER.JOB_NEW, { state: { from: "list" } })
    const ready = status === "ready"
    const isEmpty = ready && pagination.totalItems === 0
    //hồ sơ lỗi: khóa nút nhưng không kết luận "chưa xác minh" -> không hiện banner
    const showBanner = ready && !isVerified && !profileFailed
    const from = ready ? (pagination.currentPage - 1) * pagination.limit + 1 : 0
    const to = ready ? from + jobs.length - 1 : 0

    return (
        <div className="mx-auto max-w-[1100px]">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Quản lý tin</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Tin tuyển dụng</h1>
                    <p className="mt-2 text-base text-slate-600">Theo dõi, chỉnh sửa và đóng các tin bạn đã đăng.</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <Button onClick={goNew} disabled={!isVerified} aria-describedby={isVerified ? undefined : "post-lock-note"}>
                        Đăng tin
                    </Button>
                    {ready && !isVerified && !profileFailed && (
                        <p id="post-lock-note" className="text-xs text-slate-500">{LOCK_NOTE}</p>
                    )}
                </div>
            </header>

            {showBanner && (
                <div className="mb-6">
                    <VerifyStatusBanner isVerified={isVerified} unverifyReason={unverifyReason} variant="list" />
                </div>
            )}

            {status === "loading" && (
                <div role="status" className="animate-pulse space-y-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                    {[0, 1, 2, 3].map((row) => (
                        <div key={row} className="h-10 rounded bg-slate-200" />
                    ))}
                    <span className="sr-only">Đang tải danh sách tin tuyển dụng…</span>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải danh sách tin tuyển dụng</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                        Thử lại
                    </button>
                </div>
            )}

            {isEmpty && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">Chưa có tin nào</h2>
                    {isVerified ? (
                        <>
                            <p className="mt-1 text-sm text-slate-500">Đăng tin đầu tiên để ứng viên tìm thấy công ty của bạn.</p>
                            <Button onClick={goNew} className="mt-6">Đăng tin</Button>
                        </>
                    ) : (
                        <p className="mt-1 text-sm text-slate-500">Công ty cần được xác minh trước khi đăng tin đầu tiên.</p>
                    )}
                </div>
            )}

            {ready && !isEmpty && (
                <>
                    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
                        <table className="w-full min-w-[820px] text-left">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-medium text-slate-500">
                                    <th scope="col" className="px-6 py-3">Tin tuyển dụng</th>
                                    <th scope="col" className="px-4 py-3">Mức lương</th>
                                    <th scope="col" className="px-4 py-3">Hạn nộp</th>
                                    <th scope="col" className="px-4 py-3">Trạng thái</th>
                                    <th scope="col" className="px-6 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <JobRow key={job.jobId} job={job} isVerified={isVerified} busy={busyId === job.jobId} onClose={askClose} onDelete={askDelete} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Hiển thị {from}-{to} trên {pagination.totalItems}</p>
                        <div className="flex items-center gap-1.5">
                            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
                            {pageWindow(pagination.currentPage, pagination.totalPages).map((number) =>
                                number === pagination.currentPage ? (
                                    <span key={number} aria-current="page" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-[#155DFC]">{number}</span>
                                ) : (
                                    <Button key={number} variant="secondary" aria-label={`Trang ${number}`} onClick={() => setPage(number)}>{number}</Button>
                                ),
                            )}
                            <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
                        </div>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={confirm?.type === "close"}
                {...CLOSE_DIALOG}
                onYes={doConfirm}
                onNo={cancelConfirm}
            />
            <ConfirmDialog
                open={confirm?.type === "delete"}
                {...DELETE_DIALOG}
                onYes={doConfirm}
                onNo={cancelConfirm}
            />
        </div>
    )
}

export default MyJobs
