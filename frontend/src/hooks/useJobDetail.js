import { useEffect, useState } from "react"
import { getJobById, getJobErrorMsg } from "../api/job"
import { jobStatusLabel } from "../utils/jobFormat"

//Hook trang chi tiết tin (Finder, public).
//status: loading | ready | notfound | error. Chỉ 404 mới là "không tìm thấy" (BE gộp xóa / sai id / công ty chưa xác minh).
function useJobDetail(id) {
    const [job, setJob] = useState(null)
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        getJobById(id)
            .then((data) => {
                if (cancelled) return
                setJob(data)
                setStatus("ready")
            })
            .catch((err) => {
                if (cancelled) return
                if (err.response?.status === 404) setStatus("notfound")
                else {
                    setErrorMsg(getJobErrorMsg(err))
                    setStatus("error")
                }
            })
        return () => {
            cancelled = true
        }
    }, [id, reloadKey])

    const retry = () => {
        setStatus("loading")
        setReloadKey((key) => key + 1)
    }

    //Hết hạn (theo ngày VN) xét trước Đã đóng; chỉ "Đang mở" mới cho Ứng tuyển
    const label = job ? jobStatusLabel(job) : null
    return { job, status, errorMsg, label, canApply: label === "Đang mở", retry }
}

export default useJobDetail
