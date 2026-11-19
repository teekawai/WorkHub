import { useCallback, useEffect, useRef, useState } from "react"
import { generatePath, useLocation, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { getEmployerProfile } from "../api/employerProfile"
import { createJob, getMyJobById, getJobErrorMsg, updateJob } from "../api/job"
import useJobOptions from "./useJobOptions"
import { emptyJobDraft, validateJobStep1, validateJobStep2, jobToDraft, draftToBody } from "../utils/JobValidate"
import { jobStatusLabel, todayVn } from "../utils/jobFormat"
import { classifySubmitError, getRetryDelay, hasStep1Error, newIdempotencyKey, shouldGoBack } from "../utils/jobFormSubmit"
import { ROUTE_PATH } from "../routes/route"

const TOAST_ID = "job-form" //id cố định để toast không chồng nhau (StrictMode chạy effect 2 lần)
const NOT_VERIFIED_MSG = "Cần xác minh công ty để đăng tin."
const KEY_REUSED_MSG = "Tin có thể đã được đăng, vui lòng kiểm tra danh sách."
const NOT_EDITABLE_MSG = "Tin tuyển dụng đã đóng hoặc hết hạn, không thể chỉnh sửa" //đúng câu BE JOB_NOT_EDITABLE

// Hook của form đăng / sửa / đăng lại tin (2 bước). mode: create | edit | repost.
// Page nên bọc hook trong component con có key={mode + jobId} để reset khi đổi route.
// status: loading | ready | error | notFound (404 và 403 gộp, không lộ tin của công ty khác).
function useJobForm({ mode, jobId }) {
    const navigate = useNavigate()
    const from = useLocation().state?.from //"list" | "detail": trang đã mở form, để quay lại không lặp history
    const { options, errorMsg: optionsError, reload: reloadOptions } = useJobOptions()
    const [loadState, setLoadState] = useState(mode === "create" ? "ready" : "loading")
    const [loadError, setLoadError] = useState("")
    const [reloadKey, setReloadKey] = useState(0)
    const [oldDeadline, setOldDeadline] = useState("") //hạn cũ của tin gốc, chỉ dùng cho hint của repost

    const [step, setStep] = useState(1)
    const [draft, setDraft] = useState(emptyJobDraft)
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [submitErrorKey, setSubmitErrorKey] = useState(0) //tăng mỗi lần có lỗi gửi mới, UI dùng để cuộn/focus
    const [verified, setVerified] = useState(mode === "edit") //create/repost cần kiểm hồ sơ đã xác minh trước khi cho nhập
    const [idempotencyKey] = useState(() => newIdempotencyKey()) //sinh 1 lần khi mở form, giữ qua 2 bước và mọi lần gửi lại

    const mountedRef = useRef(true)
    const busyRef = useRef(false) //chặn bấm đôi (state chưa kịp cập nhật giữa 2 click)
    const timerRef = useRef(null)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            clearTimeout(timerRef.current)
        }
    }, [])

    // Đăng tin / đăng lại cần công ty đã xác minh; lỗi tải hồ sơ không chặn (BE vẫn chặn 403)
    useEffect(() => {
        if (mode === "edit") return
        let cancelled = false
        getEmployerProfile()
            .then((profile) => {
                if (cancelled) return
                if (profile?.isVerified === true) return setVerified(true)
                toast.error(NOT_VERIFIED_MSG, { id: TOAST_ID })
                navigate(ROUTE_PATH.EMPLOYER.JOBS, { replace: true })
            })
            .catch(() => !cancelled && setVerified(true))
        return () => {
            cancelled = true
        }
    }, [mode, navigate])

    // Nạp tin để sửa / đăng lại
    useEffect(() => {
        if (mode === "create") return
        let cancelled = false
        getMyJobById(jobId)
            .then((job) => {
                if (cancelled) return
                //chỉ tin Đang mở mới được sửa (Business 2.6): về chi tiết ngay, không cho nhập
                if (mode === "edit" && jobStatusLabel(job) !== "Đang mở") {
                    toast.error(NOT_EDITABLE_MSG, { id: TOAST_ID })
                    navigate(generatePath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, { id: jobId }), { replace: true })
                    return
                }
                setDraft(jobToDraft(job, { repost: mode === "repost" }))
                setOldDeadline(mode === "repost" ? job.deadline : "")
                setLoadState("ready")
            })
            .catch((err) => {
                if (cancelled) return
                if ([403, 404].includes(err.response?.status)) setLoadState("notFound")
                else {
                    setLoadError(getJobErrorMsg(err))
                    setLoadState("error")
                }
            })
        return () => {
            cancelled = true
        }
    }, [mode, jobId, reloadKey, navigate])

    const reload = () => {
        if (optionsError) reloadOptions()
        if (loadState === "error") {
            setLoadState("loading")
            setReloadKey((key) => key + 1)
        }
    }

    let status = loadState
    if (status === "ready") status = optionsError ? "error" : options && verified ? "ready" : "loading"
    const errorMsg = loadState === "error" ? loadError : optionsError

    const setField = (name, value) => {
        setDraft((current) => ({ ...current, [name]: value, ...(name === "category" ? { subCategory: "" } : {}) }))
        setErrors((current) => {
            const rest = { ...current }
            delete rest[name]
            if (name === "category") delete rest.subCategory //chuyên ngành đã bị reset
            if (name === "salaryType" && value === "Negotiable") {
                delete rest.salaryMin //ô lương đã ẩn
                delete rest.salaryMax
            }
            return rest
        })
    }

    const next = () => {
        if (!options) return
        const found = validateJobStep1(draft, options, todayVn()) //today tính lúc bấm, form có thể mở qua 00:00 VN
        setErrors(found)
        if (Object.keys(found).length === 0) setStep(2)
    }

    const back = () => setStep(1)

    const cancel = () => {
        const target =
            mode === "create"
                ? ROUTE_PATH.EMPLOYER.JOBS
                : generatePath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, { id: jobId })
        navigate(target)
    }

    const onSuccess = useCallback(() => {
        const edit = mode === "edit"
        toast.success(edit ? "Đã lưu thay đổi." : "Đã đăng tin tuyển dụng.", { id: TOAST_ID })
        const target = edit ? generatePath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, { id: jobId }) : ROUTE_PATH.EMPLOYER.JOBS
        //trang trước đúng là đích thì lùi 1 bước cho history không lặp; Back không quay về form (repost điền sẵn + key mới dễ tạo tin trùng)
        if (shouldGoBack(from, mode)) navigate(-1)
        else navigate(target, { replace: true })
    }, [mode, jobId, navigate, from])

    const onFail = (result) => {
        if (result.kind === "notEditable") {
            toast.error(result.message, { id: TOAST_ID })
            navigate(generatePath(ROUTE_PATH.EMPLOYER.JOB_DETAIL, { id: jobId }), { replace: true })
        } else if (result.kind === "keyReused") {
            //key đã dùng cho body khác: tin có thể đã tạo ở lần gửi trước, không sinh key mới (tránh đăng trùng)
            toast.error(KEY_REUSED_MSG, { id: TOAST_ID })
            navigate(ROUTE_PATH.EMPLOYER.JOBS, { replace: true })
        } else if (result.kind === "notFound" && mode === "edit") {
            toast.error(result.message, { id: TOAST_ID })
            navigate(ROUTE_PATH.EMPLOYER.JOBS, { replace: true })
        } else if (result.kind === "validation") {
            setErrors(result.errors) //thay hẳn lỗi cũ
            if (result.step1) setStep(1)
            setSubmitError(result.message)
            if (result.message) setSubmitErrorKey((key) => key + 1)
        } else {
            setSubmitError(result.message)
            setSubmitErrorKey((key) => key + 1)
        }
    }

    // 1 lần gọi API ở cuối. REQUEST_IN_PROGRESS: gửi lại cùng key + cùng body sau 2/4/8 s
    const send = async (body) => {
        for (let attempt = 0; ; attempt++) {
            try {
                if (mode === "edit") await updateJob(jobId, body)
                else await createJob(body, idempotencyKey)
                if (mountedRef.current) onSuccess()
                return
            } catch (err) {
                if (!mountedRef.current) return
                const result = classifySubmitError(err)
                const delay = result.kind === "inProgress" ? getRetryDelay(attempt) : null
                if (delay === null) return onFail(result) //hết lượt retry: result.message là message BE
                await new Promise((resolve) => {
                    timerRef.current = setTimeout(resolve, delay)
                })
                if (!mountedRef.current) return
            }
        }
    }

    const submit = async () => {
        if (busyRef.current || !options) return
        setSubmitError("")
        const found = { ...validateJobStep1(draft, options, todayVn()), ...validateJobStep2(draft) }
        if (Object.keys(found).length > 0) {
            setErrors(found)
            if (hasStep1Error(found)) setStep(1)
            return
        }
        setErrors({})
        busyRef.current = true
        setSubmitting(true) //giữ true cả lúc chờ retry
        try {
            await send(draftToBody(draft)) //chụp body 1 lần, retry dùng đúng body này
        } finally {
            busyRef.current = false
            if (mountedRef.current) setSubmitting(false)
        }
    }

    return {
        mode,
        status,
        errorMsg,
        reload,
        step,
        draft,
        errors,
        step1Banner: step === 1 && hasStep1Error(errors),
        options,
        oldDeadline,
        submitting,
        submitError,
        submitErrorKey,
        setField,
        next,
        back,
        submit,
        cancel,
    }
}

export default useJobForm
