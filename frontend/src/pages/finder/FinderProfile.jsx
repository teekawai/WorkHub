import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { getFinderProfile, getProfileMsg, updateFinderProfile, uploadAvatar } from "../../api/finderProfile"
import CvPaper from "../../components/finder/CvPaper"
import ConfirmDialog from "../../components/shared/ConfirmDialog"
import Button from "../../components/shared/Button"
import CvUploadCard from "../../components/finder/CvUploadCard"
import validateFinderProfile from "../../utils/FinderProfileValidate"

//Các field người dùng được sửa (email và avatar/cv không nằm trong form này)
const FIELDS = ["fullname", "phone", "address", "linkedIn", "educationLevel", "major", "skill", "description", "experience"]

//profile (có thể null / có field null) -> draft toàn chuỗi để gắn vào input
const toDraft = (profile) => Object.fromEntries(FIELDS.map((f) => [f, profile?.[f] ?? ""]))

//draft -> body gửi PUT: cắt khoảng trắng, field tùy chọn để trống thì gửi null
const toPayload = (draft) => ({
    fullname: draft.fullname.trim(),
    phone: draft.phone.trim(),
    ...Object.fromEntries(
        FIELDS.filter((f) => f !== "fullname" && f !== "phone").map((f) => [f, draft[f].trim() || null])
    ),
})

const AVATAR_MAX_SIZE = 2 * 1024 * 1024 //BE chỉ nhận ≤ 2MB
const AVATAR_EXT = [".jpg", ".png"] //BE không nhận .jpeg

//Trang Profile. Trạng thái tải: loading / empty (user mới, BE trả 404) / ready / error. Thêm chế độ sửa (isEditing)
function FinderProfile() {
    const [profile, setProfile] = useState(null)
    const [status, setStatus] = useState("loading")
    const [errorMsg, setErrorMsg] = useState("")
    const [reloadKey, setReloadKey] = useState(0) //đổi số này để effect chạy lại (nút Try again)

    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(() => toDraft(null)) //bản sao đang gõ dở, Cancel thì bỏ
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const paperRef = useRef(null) //trỏ tới tờ CV để chụp thành PDF
    const [confirm, setConfirm] = useState(null) //null | "save" | "cancel": hộp thoại đang mở
    const [avatarBusy, setAvatarBusy] = useState(false)

    useEffect(() => {
        let cancelled = false //tránh setState khi component đã bị gỡ (hoặc StrictMode chạy effect 2 lần ở dev)
        async function load() {
            try {
                const data = await getFinderProfile() //null nghĩa là chưa có hồ sơ
                if (cancelled) return
                if (data === null) {
                    setStatus("empty")
                } else {
                    setProfile(data)
                    setStatus("ready")
                }
            } catch (err) {
                if (cancelled) return
                setErrorMsg(getProfileMsg(err))
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
        setDraft(toDraft(profile)) //profile = null khi user mới -> draft trống
        setErrors({})
        setIsEditing(true)
    }

    const discardEdit = () => {
        setConfirm(null)
        setIsEditing(false)
        setErrors({})
    }

    //bấm Cancel: nếu chưa sửa gì thì thoát luôn, có sửa thì hỏi trước
    const askCancel = () => {
        const unchanged = JSON.stringify(draft) === JSON.stringify(toDraft(profile))
        if (unchanged) discardEdit()
        else setConfirm("cancel")
    }

    const handleChange = (name, value) => {
        setDraft((d) => ({ ...d, [name]: value }))
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined })) //gõ lại thì xóa lỗi của ô đó
    }

    //bấm Save changes: kiểm tra trước, hợp lệ mới hỏi xác nhận
    const askSave = () => {
        const found = validateFinderProfile(draft)
        if (Object.keys(found).length > 0) {
            setErrors(found)
            toast.error("Please fix the highlighted fields.", { id: "profile-save" })
            return
        }
        setConfirm("save")
    }

    const doSave = async () => {
        setConfirm(null)
        setSaving(true)
        try {
            await updateFinderProfile(toPayload(draft))
            const fresh = await getFinderProfile() //lấy lại để có email, avatar, cv mới nhất
            if (fresh) {
                setProfile(fresh)
                setStatus("ready")
            }
            setIsEditing(false)
            toast.success("Profile saved.", { id: "profile-save" })
        } catch (err) {
            toast.error(getProfileMsg(err), { id: "profile-save" })
        } finally {
            setSaving(false)
        }
    }

    //chọn ảnh đại diện: kiểm tra đuôi + dung lượng ngay ở FE, hợp lệ mới gửi lên. Upload xong BE đã tự lưu URL vào DB nên chỉ cần cập nhật state
    const handleAvatarPick = async (file) => {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        if (!AVATAR_EXT.includes(ext)) {
            toast.error("Please choose a JPG or PNG image.", { id: "avatar-upload" })
            return
        }
        if (file.size > AVATAR_MAX_SIZE) {
            toast.error("The image is too large. The maximum size is 2MB.", { id: "avatar-upload" })
            return
        }
        setAvatarBusy(true)
        try {
            const url = await uploadAvatar(file)
            setProfile((p) => ({ ...p, avatar: url }))
            toast.success("Profile photo updated.", { id: "avatar-upload" })
        } catch (err) {
            toast.error(getProfileMsg(err), { id: "avatar-upload" })
        } finally {
            setAvatarBusy(false)
        }
    }

    const showPaper = status === "ready" || (status === "empty" && isEditing)

    return (
        <div className="mx-auto max-w-[1106px]">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Profile</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Your Profile</h1>
                    <p className="mt-2 text-base text-slate-600">Your professional story, ready to share with the right opportunities.</p>
                </div>

                {showPaper && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="secondary" onClick={askCancel} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={askSave} disabled={saving}>
                                    {saving ? "Saving…" : "Save changes"}
                                </Button>
                            </>
                        ) : (
                            <Button variant="primary" onClick={startEdit}>
                                Edit profile
                            </Button>
                        )}
                    </div>
                )}
            </header>

            {status === "loading" && (
                <div role="status" className="animate-pulse space-y-4 rounded-md bg-white p-8 ring-1 ring-slate-200">
                    <div className="h-8 w-1/2 rounded bg-slate-200" />
                    <div className="h-4 w-full rounded bg-slate-200" />
                    <div className="h-4 w-5/6 rounded bg-slate-200" />
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <span className="sr-only">Loading your profile…</span>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">We couldn't load your profile</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button
                        type="button"
                        onClick={retry}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                        Try again
                    </button>
                </div>
            )}

            {status === "empty" && !isEditing && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">You haven't created your profile yet</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add your details so recruiters can see your CV when you apply.</p>
                    <Button variant="primary" onClick={startEdit} className="mt-6">
                        Create your profile
                    </Button>
                </div>
            )}

            {showPaper && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,794px)_288px] xl:items-start">
                    <CvPaper
                        ref={paperRef}
                        profile={profile}
                        edit={isEditing ? { draft, errors, onChange: handleChange } : undefined}
                        avatar={isEditing ? { canChange: !!profile, busy: avatarBusy, onPick: handleAvatarPick } : undefined}
                    />

                    {/* card upload CV: chỉ hiện khi hồ sơ đã tồn tại (BE trả 404 nếu chưa có), nằm trên trên màn nhỏ */}
                    {profile && (
                        <div className="order-first xl:sticky xl:top-6 xl:order-none">
                            <CvUploadCard
                                cvUrl={profile.cv}
                                onUploaded={(url) => setProfile((p) => ({ ...p, cv: url }))}
                            />
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirm === "save"}
                title="Save changes?"
                message="Do you want to save your changes to your profile?"
                onYes={doSave}
                onNo={() => setConfirm(null)}
            />
            <ConfirmDialog
                open={confirm === "cancel"}
                title="Discard changes?"
                message="Do you want to discard your changes? This can't be undone."
                onYes={discardEdit}
                onNo={() => setConfirm(null)}
            />
        </div>
    )
}

export default FinderProfile
