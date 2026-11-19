import { useEffect } from "react"
import { safeWebsite } from "../../utils/adminEmployers"

const DASH = "—"

//Chữ viết tắt từ 2 từ cuối của tên công ty (vd "…Sao Mai" -> SM)
const initialsOf = (name) => name.trim().split(/\s+/).slice(-2).map((word) => word[0]).join("").toUpperCase()

export function Avatar({ employer, size = "h-8 w-8 text-xs" }) {
    return employer.logo ? (
        <img src={employer.logo} alt={`Logo ${employer.companyName}`} className={`${size} shrink-0 rounded-lg object-cover`} />
    ) : (
        <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-[#155DFC]`}>
            {initialsOf(employer.companyName)}
        </span>
    )
}

export function VerifyBadge({ isVerified }) {
    return isVerified ? (
        <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Đã xác minh</span>
    ) : (
        <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Chưa xác minh</span>
    )
}

function Info({ label, children, className = "" }) {
    return (
        <div className={className}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 [overflow-wrap:anywhere]">{children ?? DASH}</dd>
        </div>
    )
}

//Panel chi tiết bên phải. Nút Xác minh / Thu hồi chỉ nằm ở đây. Không hiện emailVerified.
//locked = đang có dialog: Esc không đóng panel, nút bị khóa. busy = đang gửi verify / unverify.
function EmployerPanel({ employer, busy, locked, onClose, onVerify, onUnverify }) {
    useEffect(() => {
        if (locked) return
        const onKey = (event) => event.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [locked, onClose])

    const website = safeWebsite(employer.website)
    const disabled = busy || locked

    return (
        <aside aria-label="Chi tiết công ty" className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-[440px]">
            <div className="flex items-center justify-between px-6 pt-5">
                <p className="text-xs text-slate-500">Chi tiết công ty</p>
                <button type="button" aria-label="Đóng chi tiết công ty" onClick={onClose} className="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100">
                    ×
                </button>
            </div>
            <div className="flex items-start gap-4 border-b border-slate-200 px-6 pb-5 pt-4">
                <Avatar employer={employer} size="h-12 w-12 text-base" />
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 [overflow-wrap:anywhere]">{employer.companyName}</h2>
                    <div className="mt-1"><VerifyBadge isVerified={employer.isVerified} /></div>
                </div>
            </div>

            <dl className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-4 overflow-y-auto px-6 py-5">
                <Info label="Mã số thuế">{employer.taxCode}</Info>
                <Info label="Điện thoại">{employer.phone}</Info>
                <Info label="Email" className="col-span-2">{employer.email}</Info>
                <Info label="Năm thành lập">{employer.foundedYear}</Info>
                <Info label="Tin đang mở">{`${employer.openJobCount} tin`}</Info>
                <Info label="Website" className="col-span-2">
                    {website ? (
                        <a href={website} target="_blank" rel="noopener noreferrer" className="text-[#155DFC] hover:underline">{website}</a>
                    ) : (
                        employer.website
                    )}
                </Info>
                <Info label="Địa chỉ" className="col-span-2">{employer.address}</Info>
                <Info label="Lĩnh vực" className="col-span-2">{employer.field}</Info>
            </dl>

            <div className="border-t border-slate-200 px-6 py-4">
                {employer.isVerified ? (
                    <>
                        <p className="text-xs text-slate-500">Thu hồi sẽ đóng toàn bộ tin đang mở của công ty.</p>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={onUnverify}
                            className="ml-auto mt-3 block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Thu hồi
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-slate-500">Đối chiếu tên công ty và mã số thuế trước khi xác minh.</p>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={onVerify}
                            className="ml-auto mt-3 block rounded-lg bg-[#155DFC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F4FE0] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busy ? "Đang xác minh…" : "Xác minh"}
                        </button>
                    </>
                )}
            </div>
        </aside>
    )
}

export default EmployerPanel
