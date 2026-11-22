import useAdminEmployers from "../../hooks/useAdminEmployers"
import Button from "../../components/shared/Button"
import EmployerPanel, { Avatar, VerifyBadge } from "../../components/admin/EmployerPanel"
import UnverifyDialog from "../../components/admin/UnverifyDialog"
import ProfileChangedDialog from "../../components/admin/ProfileChangedDialog"
import ConfirmDialog from "../../components/shared/ConfirmDialog"
import { pageWindow } from "../../utils/pagination"

const TABS = [
    { key: "all", label: "Tất cả" },
    { key: "verified", label: "Đã xác minh" },
    { key: "unverified", label: "Chưa xác minh" },
]

//Trang Admin "Công ty": tìm, lọc theo xác minh, phân trang; bấm hàng mở panel chi tiết.
function AdminEmployers() {
    const {
        tab, setTab, keyword, setKeyword, search, clearFilters,
        items, pagination, page, setPage, status, fetching, errorMsg, retry,
        selected, openPanel, closePanel,
        busy, verify, verifyOpen, askVerify, cancelVerify,
        unverifyOpen, askUnverify, cancelUnverify, unverify, reasonError, clearReasonError,
        changedMsg, reloadAfterChanged,
    } = useAdminEmployers()

    const ready = status === "ready"
    const isEmpty = ready && pagination.totalItems === 0
    const hasFilter = search.trim() !== "" || tab !== "all" //từ khóa đã áp dụng (sau debounce), không phải chữ đang gõ
    const from = ready ? (pagination.currentPage - 1) * pagination.limit + 1 : 0
    const to = ready ? from + items.length - 1 : 0
    const dialogOpen = verifyOpen || unverifyOpen || changedMsg !== null

    return (
        <div className="mx-auto max-w-[1100px]">
            <header className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Quản trị</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Công ty</h1>
                <p className="mt-2 text-base text-slate-600">Xem hồ sơ công ty, xác minh hoặc thu hồi xác minh.</p>
            </header>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                        <circle cx="9" cy="9" r="6" />
                        <path d="m14 14 4 4" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        value={keyword}
                        maxLength={255}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Tìm theo tên công ty hoặc email"
                        aria-label="Tìm công ty"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none focus:border-[#155DFC] focus:ring-1 focus:ring-[#155DFC]"
                    />
                    {keyword && (
                        <button type="button" aria-label="Xóa từ khóa" onClick={() => setKeyword("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-slate-500 hover:bg-slate-100">
                            ×
                        </button>
                    )}
                </div>
                <div role="tablist" aria-label="Lọc theo xác minh" className="flex gap-1">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-[#155DFC] text-[#155DFC]" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {status === "loading" && (
                <div role="status" className="animate-pulse space-y-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                    {[0, 1, 2, 3, 4].map((row) => (
                        <div key={row} className="h-10 rounded bg-slate-200" />
                    ))}
                    <span className="sr-only">Đang tải danh sách công ty…</span>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải danh sách công ty</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                        Thử lại
                    </button>
                </div>
            )}

            {isEmpty && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">{hasFilter ? "Không tìm thấy công ty phù hợp" : "Chưa có công ty nào"}</h2>
                    {hasFilter && (
                        <>
                            <p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc xóa bộ lọc để xem tất cả công ty.</p>
                            <Button variant="secondary" onClick={clearFilters} className="mt-6">Xóa bộ lọc</Button>
                        </>
                    )}
                </div>
            )}

            {ready && !isEmpty && (
                <>
                    <div aria-busy={fetching} className={`overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 transition-opacity ${fetching ? "opacity-50" : ""}`}>
                        <table className="w-full min-w-[820px] text-left">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-medium text-slate-500">
                                    <th scope="col" className="px-6 py-3">Công ty</th>
                                    <th scope="col" className="px-4 py-3">Mã số thuế</th>
                                    <th scope="col" className="px-4 py-3">Điện thoại</th>
                                    <th scope="col" className="px-4 py-3">Tin đang mở</th>
                                    <th scope="col" className="px-4 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((employer) => {
                                    const active = selected?.userId === employer.userId
                                    return (
                                        <tr
                                            key={employer.userId}
                                            onClick={() => openPanel(employer)}
                                            className={`cursor-pointer border-t border-slate-100 ${active ? "bg-blue-50" : "hover:bg-slate-50"}`}
                                        >
                                            <td className="px-6 py-3">
                                                <button type="button" aria-pressed={active} className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-[#155DFC]">
                                                    <Avatar employer={employer} />
                                                    <span className="min-w-0">
                                                        <span className={`block font-semibold [overflow-wrap:anywhere] ${active ? "text-[#155DFC]" : "text-slate-900"}`}>{employer.companyName}</span>
                                                        <span className="block text-xs text-slate-500 [overflow-wrap:anywhere]">{employer.email}</span>
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{employer.taxCode}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{employer.phone ?? "—"}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{employer.openJobCount}</td>
                                            <td className="px-4 py-3"><VerifyBadge isVerified={employer.isVerified} /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Hiển thị {from}-{to} trên {pagination.totalItems}</p>
                        <div className="flex items-center gap-1.5">
                            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
                            {pageWindow(pagination.currentPage, pagination.totalPages).map((number) =>
                                number === pagination.currentPage ? (
                                    <span key={number} aria-current="page" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-[#155DFC]">{number}</span>
                                ) : (
                                    <Button key={number} variant="secondary" aria-label={`Trang ${number}`} onClick={() => setPage(number)}>{number}</Button>
                                ),
                            )}
                            <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
                        </div>
                    </div>
                </>
            )}

            {selected && (
                <EmployerPanel
                    employer={selected}
                    busy={busy}
                    locked={dialogOpen}
                    onClose={closePanel}
                    onVerify={askVerify}
                    onUnverify={askUnverify}
                />
            )}

            <UnverifyDialog
                open={unverifyOpen}
                companyName={selected?.companyName}
                busy={busy}
                error={reasonError}
                onClearError={clearReasonError}
                onSubmit={unverify}
                onCancel={cancelUnverify}
            />
            <ConfirmDialog
                open={verifyOpen}
                title="Xác minh công ty?"
                message={`Xác nhận xác minh "${selected?.companyName ?? ""}" (MST ${selected?.taxCode ?? ""}). Công ty sẽ đăng được tin tuyển dụng.`}
                yesLabel="Xác minh"
                noLabel="Hủy"
                onYes={verify}
                onNo={cancelVerify}
            />
            <ProfileChangedDialog open={changedMsg !== null} message={changedMsg} onReload={reloadAfterChanged} />
        </div>
    )
}

export default AdminEmployers
