import { KEYWORD_MAX } from "../../../utils/jobSearch"

// Ô tìm theo tên việc / tên công ty. Gõ xong 300 ms hook mới ghi URL (debounce ở useJobs).
function JobSearchBar({ value, onChange }) {
    return (
        <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
                type="search"
                value={value}
                maxLength={KEYWORD_MAX}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Tìm theo tên việc làm hoặc tên công ty"
                aria-label="Tìm theo tên việc làm hoặc tên công ty"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#155DFC] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
        </div>
    )
}

export default JobSearchBar
