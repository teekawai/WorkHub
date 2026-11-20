import { formatDeadline, formatDateVn, formatExperience, formatSalary, workTypeLabel } from "../../../utils/jobFormat"

//Mô tả / Yêu cầu / Quyền lợi là text thuần có xuống dòng: render dạng text (React tự escape), không dùng HTML thô
const TEXT_CLASS = "mt-2 whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]"

function Section({ title, children }) {
    return (
        <section>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className={TEXT_CLASS}>{children}</p>
        </section>
    )
}

function InfoRow({ label, value }) {
    return (
        <div>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
        </div>
    )
}

//2 cột: trái nội dung, phải card "Thông tin chung". Trường tùy chọn null thì ẩn (không in "null")
export function JobDetailBody({ job }) {
    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <Section title="Mô tả công việc">{job.description}</Section>
                <Section title="Yêu cầu ứng viên">{job.requirement}</Section>
                <Section title="Quyền lợi">{job.applicantBenefit}</Section>
                {job.skillRequired && <Section title="Kỹ năng">{job.skillRequired}</Section>}
            </div>
            <aside className="h-fit rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Thông tin chung</h2>
                <dl className="mt-4 space-y-4">
                    <InfoRow label="Mức lương" value={formatSalary(job)} />
                    <InfoRow label="Ngành nghề" value={job.category} />
                    {job.subCategory && <InfoRow label="Chuyên ngành" value={job.subCategory} />}
                    <InfoRow label="Địa điểm" value={job.location} />
                    <InfoRow label="Hình thức làm việc" value={workTypeLabel(job.workType)} />
                    <InfoRow label="Kinh nghiệm" value={formatExperience(job.yearOfExperience)} />
                    <InfoRow label="Số lượng tuyển" value={`${job.numberOfPosition} người`} />
                    <InfoRow label="Hạn nộp" value={formatDeadline(job.deadline)} />
                    <InfoRow label="Ngày đăng" value={formatDateVn(job.createdAt)} />
                </dl>
            </aside>
        </div>
    )
}

//Skeleton đúng hình 2 cột (Figma 43:1294)
export function JobDetailSkeleton() {
    return (
        <div role="status" className="animate-pulse space-y-4">
            <div className="h-8 w-1/2 rounded bg-slate-200" />
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="h-80 rounded-2xl bg-slate-200" />
                <div className="h-64 rounded-2xl bg-slate-200" />
            </div>
            <span className="sr-only">Đang tải tin tuyển dụng…</span>
        </div>
    )
}
