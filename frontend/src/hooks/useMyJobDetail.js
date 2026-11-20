import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { getMyJobById, closeJob, deleteJob, getJobErrorMsg } from "../api/job"
import { getEmployerProfile } from "../api/employerProfile"
import { jobStatusLabel } from "../utils/jobFormat"
import { ROUTE_PATH } from "../routes/route"

const TOAST_ID = "my-job-detail" //id cố định để toast không chồng nhau
const isGone = (err) => [403, 404].includes(err.response?.status) //403 gộp 404: không lộ tin của công ty khác

//Hook của trang chi tiết tin (Employer).
//status: loading | ready | notfound | error. confirm: null | "close" | "delete".
function useMyJobDetail(id) {
    const navigate = useNavigate()
    const [job, setJob] = useState(null)
    const [profile, setProfile] = useState(null)
    const [profileFailed, setProfileFailed] = useState(false) //lỗi tải hồ sơ: khóa thao tác nhưng không kết luận "chưa xác minh"
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [reloadKey, setReloadKey] = useState(0)
    const [confirm, setConfirm] = useState(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let cancelled = false
        Promise.allSettled([getMyJobById(id), getEmployerProfile()]).then(([jobRes, profileRes]) => {
            if (cancelled) return
            //phân loại theo lỗi của job trước, lỗi profile không được che 404/403
            if (jobRes.status === "rejected") {
                if (isGone(jobRes.reason)) setStatus("notfound")
                else {
                    setErrorMsg(getJobErrorMsg(jobRes.reason))
                    setStatus("error")
                }
                return
            }
            //hồ sơ lỗi không làm hỏng trang: coi như chưa xác minh được (khóa thao tác), BE vẫn chặn 403
            setJob(jobRes.value)
            setProfile(profileRes.status === "fulfilled" ? profileRes.value : null)
            setProfileFailed(profileRes.status === "rejected")
            setStatus("ready")
        })
        return () => {
            cancelled = true
        }
    }, [id, reloadKey])

    const reload = () => {
        setStatus("loading")
        setReloadKey((key) => key + 1)
    }

    const label = job ? jobStatusLabel(job) : null
    //chỉ công ty đã xác minh mới được sửa/đóng/xóa (Business 3.4); chưa có profile = không cho
    const isVerified = profile?.isVerified === true
    const canModify = status === "ready" && isVerified

    //lỗi khi đóng/xóa: 404 -> về danh sách, 403/409 -> tải lại để badge, nút, banner cập nhật
    const handleActionError = (err) => {
        toast.error(getJobErrorMsg(err), { id: TOAST_ID })
        if (err.response?.status === 404) navigate(ROUTE_PATH.EMPLOYER.JOBS, { replace: true })
        else if (err.response?.status === 403 || err.response?.status === 409) reload()
    }

    const doClose = async () => {
        setConfirm(null) //đóng hộp thoại trước khi await để bấm đúp không gửi 2 lần
        setBusy(true)
        try {
            await closeJob(id)
            toast.success("Đã đóng tin tuyển dụng.", { id: TOAST_ID })
            navigate(ROUTE_PATH.EMPLOYER.JOBS)
        } catch (err) {
            handleActionError(err)
        } finally {
            setBusy(false)
        }
    }

    const doDelete = async () => {
        setConfirm(null)
        setBusy(true)
        try {
            const data = await deleteJob(id)
            toast.success(data?.message || "Đã xóa tin tuyển dụng", { id: TOAST_ID })
            navigate(ROUTE_PATH.EMPLOYER.JOBS, { replace: true }) //Back không quay lại tin đã xóa
        } catch (err) {
            handleActionError(err)
        } finally {
            setBusy(false)
        }
    }

    return {
        job,
        isVerified,
        profileFailed,
        unverifyReason: profile?.unverifyReason ?? null,
        status,
        errorMsg,
        label,
        canModify,
        busy,
        confirm,
        retry: reload,
        askClose: () => setConfirm("close"),
        askDelete: () => setConfirm("delete"),
        cancelConfirm: () => setConfirm(null),
        doClose,
        doDelete,
    }
}

export default useMyJobDetail
