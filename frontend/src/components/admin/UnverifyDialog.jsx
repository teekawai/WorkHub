import { useEffect, useRef, useState } from "react"
import FormField from "../shared/FormField"
import { REASON_MAX, validateReason } from "../../utils/adminEmployers"

//Nội dung dialog thu hồi xác minh. Chỉ mount khi mở nên lý do / lỗi tự reset mỗi lần mở.
function UnverifyBody({ companyName, busy, error, onClearError, onSubmit, onCancel }) {
    const [reason, setReason] = useState("")
    const boxRef = useRef(null)
    const { count } = validateReason(reason)

    //focus vào ô lý do khi mở, trả focus về nút đã mở dialog khi đóng
    useEffect(() => {
        const opener = document.activeElement
        boxRef.current?.querySelector("textarea")?.focus()
        return () => opener?.focus?.()
    }, [])

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && !busy && onCancel()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [busy, onCancel])

    const change = (_name, value) => {
        setReason(value)
        if (error) onClearError()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !busy && onCancel()}>
            <div
                ref={boxRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="unverify-title"
                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="unverify-title" className="text-lg font-semibold text-slate-900">Thu hồi xác minh?</h2>
                <p className="mt-2 text-sm text-slate-600 [overflow-wrap:anywhere]">
                    Công ty {companyName} sẽ về trạng thái Chưa xác minh và không đăng tin mới được.
                </p>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Thu hồi xác minh sẽ đóng toàn bộ tin tuyển dụng đang mở của công ty này và không mở lại được. Hãy thông báo cho doanh nghiệp trước khi thu hồi.
                </div>
                <div className="mt-4">
                    <FormField
                        label="Lý do thu hồi *"
                        name="unverify-reason"
                        type="textarea"
                        rows={4}
                        value={reason}
                        onChange={change}
                        error={error}
                        hint="Nhà tuyển dụng sẽ thấy lý do này trên trang của họ."
                    />
                    <p className={`mt-1 text-right text-xs ${count > REASON_MAX ? "text-red-600" : "text-slate-400"}`}>{count}/{REASON_MAX}</p>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSubmit(reason)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {busy ? "Đang thu hồi…" : "Thu hồi xác minh"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function UnverifyDialog({ open, ...props }) {
    return open ? <UnverifyBody {...props} /> : null
}

export default UnverifyDialog
