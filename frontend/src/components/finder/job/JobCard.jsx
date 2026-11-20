import { Link, generatePath } from "react-router-dom"
import { ROUTE_PATH } from "../../../routes/route"
import { formatExperience, formatSalary } from "../../../utils/jobFormat"
import { companyInitials, timeAgo } from "../../../utils/jobSearch"

const CARD = "relative flex h-[168px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

const PIN_ICON = (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M8 14s4.5-4 4.5-7.2a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" />
        <circle cx="8" cy="6.8" r="1.6" />
    </svg>
)

const BAG_ICON = (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="1.5" y="4" width="13" height="9.5" rx="1.5" />
        <path d="M5.5 4V2.8c0-.4.3-.8.8-.8h3.4c.5 0 .8.4.8.8V4" />
    </svg>
)

// Thẻ việc làm dùng chung (trang Tìm việc + trang chủ). Cao cố định để lưới không nhảy.
// <article> + Link phủ kín thẻ; nút Ứng tuyển nổi lên trên (z-10), chưa nối đi đâu.
function JobCard({ job }) {
    return (
        <article className={`${CARD} transition-colors focus-within:border-blue-300 hover:border-blue-300`}>
            <div className="flex items-start gap-3">
                {job.logo ? (
                    <img src={job.logo} alt="" className="size-12 shrink-0 rounded-lg border border-slate-100 object-cover" />
                ) : (
                    <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-base font-semibold text-[#155DFC]">
                        {companyInitials(job.companyName)}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900" title={job.jobTitle}>
                        <Link
                            to={generatePath(ROUTE_PATH.FINDER.JOB_DETAIL, { id: job.jobId })}
                            className="after:absolute after:inset-0 after:content-[''] hover:text-[#155DFC] focus-visible:outline-none"
                        >
                            {job.jobTitle}
                        </Link>
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-600">{job.companyName}</p>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex min-w-0 items-center gap-1">{PIN_ICON}<span className="truncate">{job.location}</span></span>
                    <span className="flex shrink-0 items-center gap-1">{BAG_ICON}{formatExperience(job.yearOfExperience)}</span>
                </div>
                <span className="shrink-0">{timeAgo(job.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-900">{formatSalary(job)}</p>
                <button type="button" className="relative z-10 shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                    Ứng tuyển
                </button>
            </div>
        </article>
    )
}

export default JobCard
