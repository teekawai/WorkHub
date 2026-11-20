import { Link, useParams } from "react-router-dom"
import NavBar from "../../components/shared/NavBar"
import Footer from "../../components/shared/Footer"
import { useAuth } from "../../context/useAuth"
import useJobDetail from "../../hooks/useJobDetail"
import { JobDetailCard, JobDetailSkeleton } from "../../components/finder/job/JobDetailCard"
import { formatDeadline } from "../../utils/jobFormat"
import { timeAgo } from "../../utils/jobSearch"
import { ROUTE_PATH } from "../../routes/route"

//Text thuần có xuống dòng (React tự escape, không dùng HTML thô)
const TEXT_CLASS = "mt-2 whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]"

const Section = ({ title, children }) => (
    <section>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className={TEXT_CLASS}>{children}</p>
    </section>
)

const BackLink = () => (
    <Link to={ROUTE_PATH.FINDER.JOBS} className="text-sm text-slate-500 hover:text-slate-900">
        ‹ Quay lại tìm việc
    </Link>
)

function Banner({ label, job }) {
    const text = label === "Hết hạn"
        ? { title: "Tin đã hết hạn", body: `Hạn nộp ${formatDeadline(job.deadline)} đã qua, tin không còn nhận hồ sơ.` }
        : { title: "Tin đã đóng", body: "Nhà tuyển dụng đã ngừng nhận hồ sơ cho tin này." }
    return (
        <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">{text.title}</p>
            <p className="mt-0.5 text-sm text-amber-700">{text.body}</p>
        </div>
    )
}

//key theo id ở JobDetail: đổi tin thì mount lại, state về loading
function Content({ id }) {
    const { job, status, errorMsg, label, canApply, retry } = useJobDetail(id)

    return (
        <div className="mx-auto max-w-6xl px-5 py-8">
            <BackLink />

            {status === "loading" && <div className="mt-6"><JobDetailSkeleton /></div>}

            {status === "notfound" && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy tin tuyển dụng</h1>
                    <Link to={ROUTE_PATH.FINDER.JOBS} className="mt-6 inline-block rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F4FE0]">
                        Quay lại tìm việc
                    </Link>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải tin tuyển dụng</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                        Thử lại
                    </button>
                </div>
            )}

            {status === "ready" && (
                <>
                    {!canApply && <Banner label={label} job={job} />}
                    <header className="mt-5">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{job.jobTitle}</h1>
                        <p className="mt-2 text-slate-500">{job.companyName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                            {[job.category, job.subCategory, `Đăng ${timeAgo(job.createdAt).toLowerCase()}`].filter(Boolean).join(" · ")}
                        </p>
                    </header>
                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_368px]">
                        <div className="space-y-6 rounded-2xl bg-white p-8 ring-1 ring-slate-200">
                            <Section title="Mô tả công việc">{job.description}</Section>
                            <Section title="Yêu cầu ứng viên">{job.requirement}</Section>
                            <Section title="Quyền lợi">{job.applicantBenefit}</Section>
                            {job.skillRequired && <Section title="Kỹ năng">{job.skillRequired}</Section>}
                        </div>
                        <JobDetailCard job={job} canApply={canApply} />
                    </div>
                </>
            )}
        </div>
    )
}

//Trang công khai: khách cũng xem được, NavBar theo trạng thái đăng nhập
function JobDetail() {
    const { id } = useParams()
    const { currentUser } = useAuth()
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <NavBar currentUser={currentUser} />
            <main className="flex-1"><Content key={id} id={id} /></main>
            <Footer />
        </div>
    )
}

export default JobDetail
