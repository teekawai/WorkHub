//Cặp label + input/textarea + dòng lỗi, dùng chung cho mọi form (Finder, Employer, sau này nơi khác).
//Không tự giữ state: nhận value từ ngoài, bắn onChange(name, value) ra ngoài để nơi gọi tự quản lý draft.
const baseInputClass =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#155DFC] focus:ring-1 focus:ring-[#155DFC]"

function FormField({
    label,
    name,
    value,
    onChange,
    error,
    type = "text", // "text" | "textarea" | "number"
    placeholder,
    hint, // ghi chú nhỏ dưới label, vd gợi ý định dạng
    readOnly = false,
    rows = 3,
}) {
    const inputId = `field-${name}`
    const borderClass = error ? "border-red-400" : "border-slate-300"
    const commonProps = {
        id: inputId,
        name,
        value,
        placeholder,
        readOnly,
        "aria-invalid": !!error,
        onChange: (e) => onChange(name, e.target.value),
        className: `${baseInputClass} ${borderClass} ${readOnly ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`,
    }

    return (
        <div>
            <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                {label}
            </label>
            {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}

            {type === "textarea" ? (
                <textarea {...commonProps} rows={rows} />
            ) : (
                <input {...commonProps} type={type} />
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    )
}

export default FormField
