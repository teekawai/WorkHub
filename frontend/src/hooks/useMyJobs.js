import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { closeJob, deleteJob, getJobErrorMsg, getMyJobs } from "../api/job"
import { getEmployerProfile } from "../api/employerProfile"

const TOAST_ID = "my-jobs-action"

//Hook ôm state + logic trang "Tin tuyển dụng của tôi": danh sách phân trang, trạng thái xác minh, đóng / xóa tin.
//status: loading | ready | error (lỗi khi tải danh sách). Rỗng = ready + pagination.totalItems === 0.
//Chỉ cho sửa đổi khi isVerified === true; hồ sơ lỗi / chưa về thì khóa nút (không lạc quan).
function useMyJobs() {
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0) //đổi số này để tải lại (Thử lại, sau đóng/xóa, 403)
    const [profileKey, setProfileKey] = useState(0) //đổi số này để tải lại hồ sơ xác minh
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [jobs, setJobs] = useState([])
    const [pagination, setPagination] = useState(null)
    const [profile, setProfile] = useState(null) //null = chưa có hồ sơ (BE 404) hoặc chưa tải được
    const [profileFailed, setProfileFailed] = useState(false) //lỗi mạng/500: khóa nút nhưng không kết luận "chưa xác minh"
    const [confirm, setConfirm] = useState(null) //null | { type: "close" | "delete", job }
    const [busyId, setBusyId] = useState(null)

    //hồ sơ chỉ tải khi mount và khi gặp 403 (đổi trang / đóng / xóa không tải lại); lỗi không chặn danh sách
    useEffect(() => {
        let cancelled = false
        getEmployerProfile()
            .then((data) => {
                if (cancelled) return
                setProfile(data)
                setProfileFailed(false)
            })
            .catch(() => {
                if (cancelled) return
                setProfile(null)
                setProfileFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [profileKey])

    const reloadProfile = useCallback(() => setProfileKey((key) => key + 1), [])

    useEffect(() => {
        let cancelled = false //bỏ kết quả cũ khi đổi trang nhanh / StrictMode chạy effect 2 lần
        async function load() {
            const [jobsResult] = await Promise.allSettled([getMyJobs(page)])
            if (cancelled) return
            if (jobsResult.status === "rejected") {
                if (jobsResult.reason.response?.status === 403) reloadProfile()
                setErrorMsg(getJobErrorMsg(jobsResult.reason))
                setStatus("error")
                return
            }
            const { items, pagination: paging } = jobsResult.value
            //trang vượt tổng số trang (vừa xóa dòng cuối) mà vẫn còn tin -> lùi về trang cuối
            if (items.length === 0 && paging.totalItems > 0 && page > paging.totalPages) {
                setPage(paging.totalPages)
                return
            }
            setJobs(items)
            setPagination(paging)
            setStatus("ready")
        }
        load()
        return () => {
            cancelled = true
        }
    }, [page, reloadKey, reloadProfile])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    const retry = () => {
        setStatus("loading")
        reload()
    }

    const askClose = (job) => setConfirm({ type: "close", job })
    const askDelete = (job) => setConfirm({ type: "delete", job })
    const cancelConfirm = () => setConfirm(null)

    //đóng dialog trước khi gọi API (tránh bấm 2 lần), busyId khóa nút của hàng đang xử lý
    const doConfirm = async () => {
        const { type, job } = confirm
        setConfirm(null)
        setBusyId(job.jobId)
        try {
            if (type === "close") {
                await closeJob(job.jobId)
                toast.success("Đã đóng tin tuyển dụng.", { id: TOAST_ID })
            } else {
                const result = await deleteJob(job.jobId)
                toast.success(result?.message || "Đã xóa tin tuyển dụng", { id: TOAST_ID })
            }
        } catch (err) {
            toast.error(getJobErrorMsg(err), { id: TOAST_ID })
            if (err.response?.status === 403) reloadProfile() //có thể vừa bị bỏ xác minh
        } finally {
            setBusyId(null)
            reload() //409/404/403 cũng tải lại để danh sách + banner khớp dữ liệu thật
        }
    }

    return {
        jobs,
        pagination,
        page,
        setPage,
        status,
        errorMsg,
        retry,
        isVerified: profile?.isVerified === true,
        unverifyReason: profile?.unverifyReason ?? null,
        profileFailed,
        confirm,
        busyId,
        askClose,
        askDelete,
        cancelConfirm,
        doConfirm,
    }
}

export default useMyJobs
