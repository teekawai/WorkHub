import { useEffect, useRef } from "react"
import { Link, useMatch, useParams } from "react-router-dom"
import useJobForm from "../../hooks/useJobForm"
import Button from "../../components/shared/Button"
import JobFormStepBar from "../../components/employer/job/JobFormStepBar"
import JobFormStep1 from "../../components/employer/job/JobFormStep1"
import JobFormStep2 from "../../components/employer/job/JobFormStep2"
import { todayVn } from "../../utils/jobFormat"
import { STEP1_FIELDS, STEP2_FIELDS } from "../../utils/jobFormSubmit"
import { ROUTE_PATH } from "../../routes/route"

const TITLES = {
    create: { h1: "Đăng tin tuyển dụng", sub: "Tin hiển thị cho ứng viên ngay sau khi đăng.", submit: "Đăng tin", sending: "Đang đăng…" },
    repost: { h1: "Đăng lại tin", sub: "Nội dung lấy từ tin cũ. Tin cũ vẫn được giữ nguyên.", submit: "Đăng tin", sending: "Đang đăng…" },
    edit: { h1: "Sửa tin tuyển dụng", sub: "Chỉ sửa được tin Đang mở và còn hạn.", submit: "Lưu thay đổi", sending: "Đang lưu…" },
}

const Skeleton = () => (
    <div role="status" aria-label="Đang tải" className="mt-6 animate-pulse space-y-4">
        <div className="h-8 w-1/2 rounded bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-100" />
    </div>
)

function JobFormInner({ mode, jobId }) {
    const { status, errorMsg, reload, step, draft, errors, step1Banner, options, oldDeadline, submitting, submitError, submitErrorKey, setField, next, back, submit, cancel } = useJobForm({ mode, jobId })
    const text = TITLES[mode]
    const headingRef = useRef(null)
    const prevStep = useRef(step)
    const errorRef = useRef(null)

    //Đếm lỗi theo field của bước đang hiện
    const errorCount = (step === 1 ? STEP1_FIELDS : STEP2_FIELDS).filter((name) => errors[name]).length
    const showBanner = step === 1 ? step1Banner || errorCount > 0 : errorCount > 0

    //Đổi bước hoặc banner lỗi hiện ra: cuộn lên đầu + đưa focus về tiêu đề cho người dùng bàn phím / đọc màn hình
    useEffect(() => {
        if (!headingRef.current) return
        if (!showBanner && prevStep.current === step) return //banner tắt do đang sửa lỗi: giữ nguyên focus ô đang gõ
        prevStep.current = step
        window.scrollTo({ top: 0 })
        headingRef.current.focus({ preventScroll: true })
    }, [step, showBanner])

    //Lỗi gửi mới (kể cả cùng nội dung lần trước): cuộn tới khối lỗi + focus
    useEffect(() => {
        if (!submitErrorKey || !errorRef.current) return
        errorRef.current.scrollIntoView({ block: "center" })
        errorRef.current.focus({ preventScroll: true })
    }, [submitErrorKey])

    const onSubmit = (e) => {
        e.preventDefault() //Enter ở bước 1 chỉ sang bước 2, không gọi API
        if (submitting) return
        if (step === 1) next()
        else submit()
    }

    return (
        <div className="mx-auto max-w-[900px]">
            <Link to={ROUTE_PATH.EMPLOYER.JOBS} className="text-sm text-slate-500 hover:text-slate-900">‹ Tin tuyển dụng của tôi</Link>

            {status === "loading" && <Skeleton />}

            {status === "notFound" && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy tin tuyển dụng</h1>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Tin có thể đã bị xóa hoặc không thuộc công ty của bạn.</p>
                    <Link to={ROUTE_PATH.EMPLOYER.JOBS} className="mt-6 inline-block rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F4FE0]">Về danh sách</Link>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải biểu mẫu</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button type="button" onClick={reload} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">Thử lại</button>
                </div>
            )}

            {status === "ready" && (
                <form onSubmit={onSubmit} noValidate className="mt-3 space-y-6">
                    <header>
                        <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Tin tuyển dụng</p>
                        <h1 ref={headingRef} tabIndex={-1} className="mt-1 outline-none text-3xl font-semibold tracking-tight text-slate-900">{text.h1}</h1>
                        <p className="mt-2 text-sm text-slate-600">{text.sub}</p>
                    </header>

                    <JobFormStepBar step={step} />

                    {showBanner && (
                        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-red-500">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4M12 16h.01" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-red-800">Vui lòng sửa các trường được đánh dấu.</p>
                                {errorCount > 0 && <p className="mt-0.5 text-sm text-red-700">Có {errorCount} trường chưa hợp lệ. Lỗi hiện ngay dưới từng ô.</p>}
                            </div>
                        </div>
                    )}
                    {submitError && (
                        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 outline-none">{submitError}</div>
                    )}

                    {step === 1
                        ? <JobFormStep1 draft={draft} errors={errors} options={options} setField={setField} today={todayVn()} oldDeadline={oldDeadline} />
                        : <JobFormStep2 draft={draft} errors={errors} setField={setField} />}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        {step === 1 ? (
                            <>
                                <Button variant="secondary" onClick={cancel}>Hủy</Button>
                                <Button type="submit">Tiếp tục</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" disabled={submitting} onClick={back}>Quay lại</Button>
                                <Button type="submit" disabled={submitting}>{submitting ? text.sending : text.submit}</Button>
                            </>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}

//Chọn chế độ theo route; key để đổi route thì hook mount lại, state về ban đầu
function JobForm() {
    const { id } = useParams()
    const isEdit = Boolean(useMatch(ROUTE_PATH.EMPLOYER.JOB_EDIT))
    const isRepost = Boolean(useMatch(ROUTE_PATH.EMPLOYER.JOB_REPOST))
    const mode = isEdit ? "edit" : isRepost ? "repost" : "create"
    return <JobFormInner key={mode + (id ?? "")} mode={mode} jobId={id} />
}

export default JobForm
