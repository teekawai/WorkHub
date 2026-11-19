import NavBar from "../../components/shared/NavBar"
import Footer from "../../components/shared/Footer"
import Button from "../../components/shared/Button"
import JobCard from "../../components/finder/job/JobCard"
import JobCardSkeleton from "../../components/finder/job/JobCardSkeleton"
import JobFilters from "../../components/finder/job/JobFilters"
import JobSearchBar from "../../components/finder/job/JobSearchBar"
import { useAuth } from "../../context/useAuth"
import useJobs from "../../hooks/useJobs"
import useJobOptions from "../../hooks/useJobOptions"
import { pageWindow } from "../../utils/pagination"
import { SORT_OPTIONS } from "../../utils/jobSearch"

const PAGE_BTN = "rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"

// Trang Tìm việc (công khai). Bộ lọc nằm trong URL query, logic ở useJobs.
function JobListing() {
    const { currentUser } = useAuth()
    const { options, loading: optionsLoading } = useJobOptions()
    const { filters, keywordInput, setKeyword, update, clearFilters, setPage, items, pagination, status, errorMsg, rateLimitedSec, reload } = useJobs({ options, optionsReady: !optionsLoading })

    const loading = status === "loading"
    const ready = status === "ready"
    const total = pagination?.totalItems ?? 0
    const pages = pagination?.totalPages ?? 0
    // có bộ lọc ngoài keyword/sort/page -> nút "Xóa bộ lọc" có nghĩa
    const hasFilter = ["category", "subCategory", "location", "workType", "salary", "experience"].some((key) => filters[key])

    const goPage = (page) => {
        setPage(page)
        window.scrollTo({ top: 0 })
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <NavBar currentUser={currentUser} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Việc làm</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Tìm việc làm</h1>
                <p className="mt-2 text-sm text-slate-600">Việc làm từ các công ty đã được xác minh.</p>

                {/* dính ngay dưới NavBar (sticky, cao h-16) khi cuộn; nền đặc để thẻ việc làm cuộn bên dưới không lộ */}
                <div className="sticky top-16 z-30 -mx-4 mt-6 space-y-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:-mx-6 sm:px-6">
                    <JobSearchBar value={keywordInput} onChange={setKeyword} />
                    <JobFilters filters={filters} options={options} update={update} onClear={clearFilters} />
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-700" aria-live="polite">
                        {pagination && <>Hiện đang có <span className="font-medium text-[#155DFC]">{total}</span> việc làm</>}
                    </p>
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                        Sắp xếp theo
                        <select value={filters.sortBy} onChange={(event) => update({ sortBy: event.target.value })} className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700">
                            {SORT_OPTIONS.map((sort) => <option key={sort.key} value={sort.key}>{sort.label}</option>)}
                        </select>
                    </label>
                </div>

                {rateLimitedSec !== null && !loading && (
                    <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p>Bạn thao tác quá nhanh, vui lòng thử lại sau{rateLimitedSec > 0 ? ` ${rateLimitedSec} giây` : ""}.</p>
                        <button type="button" onClick={reload} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100">Thử lại</button>
                    </div>
                )}

                {loading && (
                    <div role="status" className="mt-4 grid gap-4 md:grid-cols-2">
                        {Array.from({ length: 6 }, (_, index) => <JobCardSkeleton key={index} />)}
                        <span className="sr-only">Đang tải việc làm…</span>
                    </div>
                )}

                {status === "error" && (
                    <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-5">
                        <p className="text-sm font-medium text-red-800">Không thể tải danh sách việc làm</p>
                        <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                        <button type="button" onClick={reload} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Thử lại</button>
                    </div>
                )}

                {ready && items.length === 0 && rateLimitedSec === null && (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                        <h2 className="text-lg font-semibold text-slate-900">Không tìm thấy việc làm phù hợp</h2>
                        <p className="mt-1 text-sm text-slate-500">Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.</p>
                        {/* trang vượt tổng số trang (vẫn có kết quả) -> về trang 1; còn lại -> xóa bộ lọc */}
                        {total > 0 ? (
                            <Button onClick={() => goPage(1)} className="mt-6">Về trang đầu</Button>
                        ) : hasFilter && (
                            <Button onClick={clearFilters} className="mt-6">Xóa bộ lọc</Button>
                        )}
                    </div>
                )}

                {ready && items.length > 0 && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {items.map((job) => <JobCard key={job.jobId} job={job} />)}
                    </div>
                )}

                {ready && pages > 1 && (
                    <nav aria-label="Phân trang" className="mt-8 flex flex-wrap items-center gap-2">
                        <button type="button" disabled={pagination.currentPage <= 1} onClick={() => goPage(pagination.currentPage - 1)} className={`${PAGE_BTN} border-slate-300 bg-white text-slate-700`}>Trước</button>
                        {pageWindow(pagination.currentPage, pages).map((page) => (
                            <button key={page} type="button" aria-current={page === pagination.currentPage ? "page" : undefined} onClick={() => goPage(page)}
                                className={`${PAGE_BTN} ${page === pagination.currentPage ? "border-blue-200 bg-blue-50 text-[#155DFC]" : "border-transparent text-slate-700"}`}>
                                {page}
                            </button>
                        ))}
                        <button type="button" disabled={pagination.currentPage >= pages} onClick={() => goPage(pagination.currentPage + 1)} className={`${PAGE_BTN} border-slate-300 bg-white text-slate-700`}>Sau</button>
                    </nav>
                )}
            </main>
            <Footer />
        </div>
    )
}

export default JobListing
