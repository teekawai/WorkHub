//Thanh bước đầu form tin (Figma 77:2699). Chỉ hiển thị, không bấm được.
const STEPS = ["Thông tin chung", "Lương và nội dung"]

function JobFormStepBar({ step }) {
    return (
        <ol className="flex items-center gap-3" aria-label="Các bước đăng tin">
            {STEPS.map((label, index) => {
                const number = index + 1
                const active = number === step
                return (
                    <li key={label} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
                        {index > 0 && <span className="h-px w-12 bg-slate-200" aria-hidden="true" />}
                        <span className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${active ? "bg-[#155DFC] text-white" : "bg-slate-100 text-slate-500"}`}>
                                {number}
                            </span>
                            <span className={`text-sm font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

export default JobFormStepBar
