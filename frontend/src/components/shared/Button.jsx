//Nút dùng chung cho toàn app: variant "primary" (nền xanh) / "secondary" (viền, nền trắng).
//Thay cho việc lặp lại className ở FinderProfile.jsx, dùng lại cho Employer và mọi nơi khác.
const VARIANT_CLASS = {
    primary: "rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F4FE0] disabled:cursor-not-allowed disabled:opacity-60",
    secondary: "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
}

function Button({ variant = "primary", type = "button", className = "", children, ...rest }) {
    return (
        <button type={type} className={`${VARIANT_CLASS[variant]} ${className}`.trim()} {...rest}>
            {children}
        </button>
    )
}

export default Button
