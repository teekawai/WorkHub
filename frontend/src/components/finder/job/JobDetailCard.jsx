import { useState } from "react"
import { companyInitials } from "../../../utils/jobSearch"
import { formatDeadline, formatExperience, formatSalary, workTypeLabel } from "../../../utils/jobFormat"

function Info({ label, value }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
        </div>
    )
}

//Giới thiệu công ty là text thuần (React tự escape). "Xem thêm" chỉ mở rộng tại chỗ, không có trang công ty.
function CompanyBlock({ job }) {
    const [open, setOpen] = useState(false)
    const initials = companyInitials(job.companyName)
    return (
        <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center gap-3">
                {job.logo ? (
                    <img src={job.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">{initials}</span>
                )}
                <h2 className="text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{job.companyName}</h2>
            </div>
            <dl className="mt-4 space-y-3">
                {job.companyAddress && <Info label="Địa chỉ" value={job.companyAddress} />}
                {job.companyFoundedYear != null && <Info label="Năm thành lập" value={job.companyFoundedYear} />}
            </dl>
            {job.companyDescription && (
                <div className="mt-3">
                    <p className="text-xs text-slate-500">Giới thiệu</p>
                    <p className={`mt-0.5 whitespace-pre-line text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] ${open ? "" : "line-clamp-3"}`}>{job.companyDescription}</p>
                    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                        {open ? "Thu gọn" : "Xem thêm"}
                    </button>
                </div>
            )}
        </div>
    )
}

//Card phải (Figma 63:479): sticky top 24px. Nút Ứng tuyển chưa nối đi đâu (user chốt), ẩn khi hết hạn / đã đóng.
export function JobDetailCard({ job, canApply }) {
    return (
        <aside className="h-fit space-y-5 rounded-2xl bg-white p-6 ring-1 ring-slate-200 lg:sticky lg:top-24">
            <div>
                <p className="text-xs text-slate-500">Mức lương</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatSalary(job)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Info label="Địa điểm" value={job.location} />
                <Info label="Hình thức làm việc" value={workTypeLabel(job.workType)} />
                <Info label="Kinh nghiệm" value={formatExperience(job.yearOfExperience)} />
                <Info label="Số lượng tuyển" value={`${job.numberOfPosition} người`} />
                <Info label="Hạn nộp" value={formatDeadline(job.deadline)} />
            </dl>
            {canApply && (job.hasApplied ? (
                <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500">
                    Đã ứng tuyển
                </button>
            ) : (
                <button type="button" className="w-full rounded-lg bg-[#155DFC] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0F4FE0]">
                    Ứng tuyển
                </button>
            ))}
            <CompanyBlock job={job} />
        </aside>
    )
}

//Skeleton đúng hình 2 cột (Figma 10.2.1)
export function JobDetailSkeleton() {
    return (
        <div role="status" className="animate-pulse">
            <div className="h-9 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_368px]">
                <div className="h-96 rounded-2xl bg-slate-200" />
                <div className="h-96 rounded-2xl bg-slate-200" />
            </div>
            <span className="sr-only">Đang tải tin tuyển dụng…</span>
        </div>
    )
}
