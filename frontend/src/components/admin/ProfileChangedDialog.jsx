import { useEffect } from "react"

//Dialog 409 "hồ sơ vừa thay đổi": chỉ 1 nút "Tải lại"; Esc / bấm nền cũng = Tải lại (không để panel giữ dữ liệu cũ).
function ProfileChangedDialog({ open, message, onReload }) {
    useEffect(() => {
        if (!open) return
        const onKey = (event) => event.key === "Escape" && onReload()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onReload])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onReload}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-changed-title"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="profile-changed-title" className="text-lg font-semibold text-slate-900">Thông tin công ty đã thay đổi</h2>
                <p className="mt-2 text-sm text-slate-600">{message}</p>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        autoFocus
                        onClick={onReload}
                        className="rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F4FE0]"
                    >
                        Tải lại
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfileChangedDialog
