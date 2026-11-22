import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { getAdminErrorCode, getAdminErrorMsg, getEmployers, getFieldError, unverifyEmployer, verifyEmployer } from "../api/admin"
import { buildQuery, mergeSelected, validateReason } from "../utils/adminEmployers"

const TOAST_ID = "admin-employer-action"
const SEARCH_DELAY = 300
const ACTION_DELAY_MS = 1000 //chờ 1s trước khi gửi xác minh / thu hồi (user chốt 2026-11-20), nút hiện trạng thái đang xử lý

//Hook ôm state trang Admin "Công ty": danh sách (tìm / lọc / phân trang), panel chi tiết, xác minh, thu hồi.
//status: loading | ready | error. `selected` là snapshot công ty đang mở panel, người dùng tự đóng.
function useAdminEmployers() {
    const [tab, setTabState] = useState("all") //all | verified | unverified
    const [keyword, setKeyword] = useState("") //chữ đang gõ
    const [search, setSearch] = useState("") //chữ đã debounce, dùng để gọi API
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [items, setItems] = useState([])
    const [pagination, setPagination] = useState(null)
    const [selected, setSelected] = useState(null)
    const [busy, setBusy] = useState(false) //đang gọi verify / unverify
    const [unverifyOpen, setUnverifyOpen] = useState(false)
    const [verifyOpen, setVerifyOpen] = useState(false) //hộp xác nhận Xác minh
    const [reasonError, setReasonError] = useState("")
    const [changedMsg, setChangedMsg] = useState(null) //null = dialog 409 đóng
    const [loadedKey, setLoadedKey] = useState("") //khóa của lần tải đã về, khác khóa hiện tại = đang tải lại
    const changedIdRef = useRef(null) //công ty vừa gặp 409, đang chờ danh sách mới để kiểm còn tìm thấy không
    const busyRef = useRef(false) //chặn bấm 2 lần trước khi state kịp cập nhật

    //debounce ô tìm; đổi chữ thì về trang 1
    useEffect(() => {
        if (keyword === search) return
        const timer = setTimeout(() => {
            setSearch(keyword)
            setPage(1)
        }, SEARCH_DELAY)
        return () => clearTimeout(timer)
    }, [keyword, search])

    useEffect(() => {
        let cancelled = false //bỏ kết quả cũ khi gõ / đổi trang nhanh
        async function load() {
            try {
                const data = await getEmployers(buildQuery({ keyword: search, tab, page }))
                if (cancelled) return
                //trang vượt tổng số trang mà vẫn còn dữ liệu -> lùi về trang cuối
                if (data.items.length === 0 && data.pagination.totalItems > 0 && page > data.pagination.totalPages) {
                    setPage(data.pagination.totalPages)
                    return
                }
                const changedId = changedIdRef.current
                changedIdRef.current = null
                if (changedId !== null && !data.items.some((item) => item.userId === changedId)) {
                    //công ty đổi tên nên rời kết quả: bỏ snapshot cũ, tránh bấm Xác minh lại với tên / MST cũ -> 409 lặp
                    setSelected((prev) => (prev?.userId === changedId ? null : prev))
                    toast.error("Thông tin công ty đã thay đổi, vui lòng tìm lại công ty.", { id: TOAST_ID })
                }
                setItems(data.items)
                setPagination(data.pagination)
                setSelected((prev) => mergeSelected(prev, data.items, null))
                setLoadedKey(`${search}|${tab}|${page}|${reloadKey}`)
                setStatus("ready")
            } catch (err) {
                if (cancelled) return
                setErrorMsg(getAdminErrorMsg(err))
                setStatus("error")
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [search, tab, page, reloadKey])

    const fetching = status === "ready" && loadedKey !== `${search}|${tab}|${page}|${reloadKey}`

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    const retry = () => {
        setStatus("loading")
        reload()
    }

    const setTab = (next) => {
        if (next === tab) return
        setTabState(next)
        setPage(1)
    }

    const clearFilters = () => {
        setKeyword("")
        setSearch("")
        setTabState("all")
        setPage(1)
    }

    const openPanel = (employer) => setSelected(employer)
    const closePanel = () => setSelected(null)

    //chạy 1 hành động có khóa nút, bỏ qua nếu đang chạy hành động khác
    const guard = async (action) => {
        if (busyRef.current || !selected) return
        busyRef.current = true
        setBusy(true)
        try {
            await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY_MS))
            await action()
        } finally {
            busyRef.current = false
            setBusy(false)
        }
    }

    //bấm Xác minh ở panel chỉ mở hộp xác nhận; xác nhận xong mới gọi API
    const askVerify = () => setVerifyOpen(true)
    const cancelVerify = () => setVerifyOpen(false)

    //gửi companyName / taxCode nguyên văn từ snapshot (từ GET), BE so khớp để phát hiện hồ sơ vừa đổi
    const verify = () => {
        setVerifyOpen(false)
        const { userId } = selected //giữ id lúc bấm: panel có thể đã đổi sang công ty khác khi API về
        return guard(async () => {
            try {
                const result = await verifyEmployer(userId, { companyName: selected.companyName, taxCode: selected.taxCode })
                toast.success(result?.message || "Đã xác minh công ty", { id: TOAST_ID })
                setSelected((prev) => mergeSelected(prev, [], { isVerified: true }, userId))
                reload()
            } catch (err) {
                if (getAdminErrorCode(err) === "EMPLOYER_PROFILE_CHANGED") {
                    setChangedMsg(getAdminErrorMsg(err))
                    return
                }
                toast.error(getAdminErrorMsg(err), { id: TOAST_ID })
                if (err.response?.status === 404) reload()
            }
        })
    }

    const askUnverify = () => {
        setReasonError("")
        setUnverifyOpen(true)
    }
    const cancelUnverify = () => setUnverifyOpen(false)
    const clearReasonError = () => setReasonError("")

    const unverify = (reason) => {
        const check = validateReason(reason)
        if (!check.ok) {
            setReasonError(check.error)
            return
        }
        const { userId } = selected
        return guard(async () => {
            try {
                const result = await unverifyEmployer(userId, reason)
                toast.success(result?.message || "Đã thu hồi xác minh", { id: TOAST_ID })
                setSelected((prev) => mergeSelected(prev, [], { isVerified: false, openJobCount: 0 }, userId))
                setUnverifyOpen(false)
                reload()
            } catch (err) {
                const fieldError = getFieldError(err, "reason")
                if (fieldError) {
                    setReasonError(fieldError)
                    return
                }
                toast.error(getAdminErrorMsg(err), { id: TOAST_ID })
                if (err.response?.status === 404) {
                    setUnverifyOpen(false)
                    reload()
                }
            }
        })
    }

    //"Tải lại" ở dialog 409: về trạng thái đang tải, panel nhận tên / MST mới khi danh sách về
    const reloadAfterChanged = () => {
        setChangedMsg(null)
        changedIdRef.current = selected?.userId ?? null
        setStatus("loading")
        reload()
    }

    return {
        tab, setTab, keyword, setKeyword, search, clearFilters,
        items, pagination, page, setPage, status, fetching, errorMsg, retry,
        selected, openPanel, closePanel,
        busy, verify, verifyOpen, askVerify, cancelVerify,
        unverifyOpen, askUnverify, cancelUnverify, unverify, reasonError, clearReasonError,
        changedMsg, reloadAfterChanged,
    }
}

export default useAdminEmployers
