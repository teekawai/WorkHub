import { Link, generatePath, useNavigate, useParams } from "react-router-dom"
import useMyJobDetail from "../../hooks/useMyJobDetail"
import Button from "../../components/shared/Button"
import ConfirmDialog from "../../components/shared/ConfirmDialog"
import VerifyStatusBanner from "../../components/employer/job/VerifyStatusBanner"
import { JobDetailBody, JobDetailSkeleton } from "../../components/employer/job/JobDetailBody"
import { BADGE_CLASS, CLOSE_DIALOG, DELETE_DIALOG } from "../../components/employer/job/jobUi"
import { formatDateVn, formatDeadline } from "../../utils/jobFormat"
import { ROUTE_PATH } from "../../routes/route"

const BackLink = () => (
    <Link to={ROUTE_PATH.EMPLOYER.JOBS} className="text-sm text-slate-500 hover:text-slate-900">
        ‹ Tin tuyển dụng của tôi
    </Link>
)

//Trang chỉ điều phối: hook lo dữ liệu + hành động. 404 và 403 cùng một màn trung tính.
function MyJobDetailContent({ id }) {
    const navigate = useNavigate()
    const {
        job, isVerified, unverifyReason, profileFailed, status, errorMsg, label, canModify, busy, confirm,
        retry, askClose, askDelete, cancelConfirm, doClose, doDelete,
    } = useMyJobDetail(id)

    return (
        <div className="mx-auto max-w-[900px]">
            <BackLink />

            {status === "loading" && <div className="mt-4"><JobDetailSkeleton /></div>}

            {status === "notfound" && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy tin tuyển dụng</h1>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Tin có thể đã bị xóa hoặc không thuộc công ty của bạn.</p>
                    <Button onClick={() => navigate(ROUTE_PATH.EMPLOYER.JOBS)} className="mt-6">Về danh sách</Button>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải tin tuyển dụng</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                        Thử lại
                    </button>
                </div>
            )}

            {status === "ready" && (
                <>
                    <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Chi tiết tin</p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{job.jobTitle}</h1>
                            <p className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[label]}`}>{label}</span>
                                Đăng ngày {formatDateVn(job.createdAt)}
                            </p>
                        </div>
                        {canModify && (
                            <div className="flex gap-2">
                                {label === "Đang mở" ? (
                                    <>
                                        <Button disabled={busy} onClick={() => navigate(generatePath(ROUTE_PATH.EMPLOYER.JOB_EDIT, { id }), { state: { from: "detail" } })}>Sửa</Button>
                                        <Button variant="secondary" disabled={busy} onClick={askClose}>Đóng tin</Button>
                                    </>
                                ) : (
                                    <Button disabled={busy} onClick={() => navigate(generatePath(ROUTE_PATH.EMPLOYER.JOB_REPOST, { id }), { state: { from: "detail" } })}>Đăng lại</Button>
                                )}
                                <Button variant="secondary" disabled={busy} onClick={askDelete}>Xóa</Button>
                            </div>
                        )}
                    </header>

                    {/* tối đa 1 banner: xác minh > hết hạn > đã đóng */}
                    <div className="my-5">
                        {!isVerified && !profileFailed ? (
                            <VerifyStatusBanner isVerified={false} unverifyReason={unverifyReason} variant="detail" />
                        ) : label === "Hết hạn" ? (
                            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-medium text-amber-800">Tin đã hết hạn</p>
                                <p className="mt-1 text-sm text-amber-700">Hạn nộp {formatDeadline(job.deadline)} đã qua. Bấm Đăng lại để đăng tin mới với hạn nộp mới.</p>
                            </div>
                        ) : label === "Đã đóng" ? (
                            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-medium text-amber-800">Tin đã đóng</p>
                                <p className="mt-1 text-sm text-amber-700">Ứng viên không còn thấy tin này. Bấm Đăng lại để đăng một tin mới từ nội dung này.</p>
                            </div>
                        ) : null}
                    </div>

                    <JobDetailBody job={job} />
                </>
            )}

            <ConfirmDialog
                open={confirm === "close"}
                {...CLOSE_DIALOG}
                onYes={doClose}
                onNo={cancelConfirm}
            />
            <ConfirmDialog
                open={confirm === "delete"}
                {...DELETE_DIALOG}
                onYes={doDelete}
                onNo={cancelConfirm}
            />
        </div>
    )
}

//key theo id: đổi tin thì mount lại, state về loading mà không cần setState trong effect
function MyJobDetail() {
    const { id } = useParams()
    return <MyJobDetailContent key={id} id={id} />
}

export default MyJobDetail
