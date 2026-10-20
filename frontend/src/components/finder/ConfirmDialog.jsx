import { useEffect } from "react"

//Hộp thoại Yes / No. Hiện khi `open` = true. Bấm nền tối hoặc phím Esc = chọn No.
function ConfirmDialog({ open, title, message, onYes, onNo }) {
    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === "Escape") onNo()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onNo])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onNo}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{message}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        autoFocus
                        onClick={onNo}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        No
                    </button>
                    <button
                        type="button"
                        onClick={onYes}
                        className="rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F4FE0]"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
