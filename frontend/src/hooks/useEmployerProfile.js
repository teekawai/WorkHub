import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import {
    getEmployerProfile,
    getEmployerProfileMsg,
    updateEmployerProfile,
    uploadLogo,
} from "../api/employerProfile"
import validateEmployerProfile from "../utils/EmployerProfileValidate"

//Các field người dùng được sửa qua form (email chỉ đọc, logo có luồng upload riêng)
const FIELDS = ["companyName", "address", "description", "website", "field", "foundedYear", "phone", "taxCode"]
const REQUIRED_FIELDS = ["companyName", "address", "field", "phone", "taxCode"] //foundedYear xử lý riêng vì là number

//profile (có thể null / có field null) -> draft toàn chuỗi để gắn vào input, kể cả foundedYear (number -> string)
const toDraft = (profile) =>
    Object.fromEntries(FIELDS.map((f) => [f, profile?.[f] != null ? String(profile[f]) : ""]))

//draft -> body gửi PUT: field bắt buộc trim, field tùy chọn trống thì gửi null, foundedYear parse về number
const toPayload = (draft) => ({
    ...Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, draft[f].trim()])),
    description: draft.description.trim() || null,
    website: draft.website.trim() || null,
    foundedYear: draft.foundedYear.trim() ? Number(draft.foundedYear.trim()) : null,
})

const LOGO_MAX_SIZE = 2 * 1024 * 1024 //BE chỉ nhận ≤ 2MB, giống avatar bên Finder
const LOGO_EXT = [".jpg", ".png"] //BE không nhận .jpeg

//Hook ôm toàn bộ state + logic của trang Company Profile: load/edit/save/upload logo.
//status: loading | empty (BE 404, chưa có hồ sơ) | ready | error — copy 4 trạng thái của Finder.
function useEmployerProfile() {
    const [profile, setProfile] = useState(null)
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [reloadKey, setReloadKey] = useState(0) //đổi số này để effect load lại (nút Try again)

    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(() => toDraft(null)) //bản sao đang gõ dở, Cancel thì bỏ
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [logoBusy, setLogoBusy] = useState(false)
    const [logoError, setLogoError] = useState("") //lỗi upload logo, hiện cố định dưới logo (toast tự mất nên dễ bỏ sót)
    const [confirm, setConfirm] = useState(null) //null | "save" | "cancel": hộp thoại đang mở

    useEffect(() => {
        let cancelled = false //tránh setState khi component đã gỡ (hoặc StrictMode chạy effect 2 lần ở dev)
        async function load() {
            try {
                const data = await getEmployerProfile() //null nghĩa là chưa có hồ sơ (BE 404)
                if (cancelled) return
                if (data === null) {
                    setStatus("empty")
                } else {
                    setProfile(data)
                    setStatus("ready")
                }
            } catch (err) {
                if (cancelled) return
                setErrorMsg(getEmployerProfileMsg(err))
                setStatus("error")
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const retry = () => {
        setStatus("loading")
        setReloadKey((key) => key + 1)
    }

    const startEdit = () => {
        setDraft(toDraft(profile)) //profile = null khi chưa có hồ sơ -> draft trống
        setErrors({})
        setIsEditing(true)
    }

    const discardEdit = () => {
        setConfirm(null)
        setIsEditing(false)
        setErrors({})
        setLogoError("")
    }

    //bấm Cancel: chưa sửa gì thì thoát luôn, có sửa thì hỏi trước
    const askCancel = () => {
        const unchanged = JSON.stringify(draft) === JSON.stringify(toDraft(profile))
        if (unchanged) discardEdit()
        else setConfirm("cancel")
    }

    const handleChange = (name, value) => {
        setDraft((d) => ({ ...d, [name]: value }))
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined })) //gõ lại thì xóa lỗi của ô đó
    }

    //bấm Save changes: validate trước, hợp lệ mới hỏi xác nhận
    const askSave = () => {
        const found = validateEmployerProfile(draft)
        if (Object.keys(found).length > 0) {
            setErrors(found)
            toast.error("Please fix the highlighted fields.", { id: "employer-profile-save" })
            return
        }
        setConfirm("save")
    }

    const doSave = async () => {
        setConfirm(null)
        setSaving(true)
        try {
            await updateEmployerProfile(toPayload(draft))
            const fresh = await getEmployerProfile() //lấy lại để có email, logo mới nhất
            if (fresh) {
                setProfile(fresh)
                setStatus("ready")
            }
            setIsEditing(false)
            toast.success("Company profile saved.", { id: "employer-profile-save" })
        } catch (err) {
            toast.error(getEmployerProfileMsg(err), { id: "employer-profile-save" })
        } finally {
            setSaving(false)
        }
    }

    //chọn logo: kiểm tra đuôi + dung lượng ở FE trước, hợp lệ mới gửi lên. Chỉ bật khi hồ sơ đã tồn tại.
    const handleLogoPick = async (file) => {
        setLogoError("")
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        if (!LOGO_EXT.includes(ext)) {
            const msg = "Please choose a JPG or PNG image."
            setLogoError(msg)
            toast.error(msg, { id: "logo-upload" })
            return
        }
        if (file.size > LOGO_MAX_SIZE) {
            const mb = (file.size / 1024 / 1024).toFixed(2)
            const msg = `This image is ${mb}MB. The maximum size is ${LOGO_MAX_SIZE / 1024 / 1024}MB.`
            setLogoError(msg)
            toast.error(msg, { id: "logo-upload" })
            return
        }
        setLogoBusy(true)
        try {
            const url = await uploadLogo(file)
            setProfile((p) => ({ ...p, logo: url }))
            toast.success("Company logo updated.", { id: "logo-upload" })
        } catch (err) {
            //400 từ BE kèm lý do cụ thể (dạng chuỗi) thì hiện luôn lý do đó, còn lại dùng câu chung theo status
            const beMsg = err.response?.status === 400 && typeof err.response.data === "string" ? err.response.data : null
            const msg = beMsg || getEmployerProfileMsg(err)
            setLogoError(msg)
            toast.error(msg, { id: "logo-upload" })
        } finally {
            setLogoBusy(false)
        }
    }

    return {
        profile,
        status,
        errorMsg,
        retry,
        isEditing,
        draft,
        errors,
        saving,
        logoBusy,
        logoError,
        confirm,
        startEdit,
        askCancel,
        discardEdit,
        handleChange,
        askSave,
        doSave,
        setConfirm,
        handleLogoPick,
    }
}

export default useEmployerProfile
