//Banner trạng thái xác minh công ty, dùng ở danh sách tin, chi tiết tin, hồ sơ công ty.
//isVerified true -> không hiện. false + unverifyReason -> đỏ (bị thu hồi). false không lý do -> vàng (chưa xác minh).
//variant chọn câu thân: "list" | "detail" | "profile". children = vùng phụ dưới câu (nút, ghi chú).
const REVOKED_BODY = {
    list: (reason) => `Lý do: ${reason}. Các tin đang mở đã được đóng.`,
    profile: (reason) => `Lý do: ${reason}. Các tin đang mở đã được đóng.`,
    detail: () => "Bạn chỉ có thể xem tin. Liên hệ quản trị viên để được xác minh lại.", //Figma 43:1203 không kèm lý do
}
const UNVERIFIED_BODY = "Bạn chỉ có thể xem tin. Sau khi quản trị viên xác minh, bạn có thể đăng, sửa, đóng và xóa tin."

function VerifyStatusBanner({ isVerified, unverifyReason, variant = "list", children }) {
    if (isVerified) return null
    const revoked = Boolean(unverifyReason)
    const tone = revoked
        ? { box: "border-red-200 bg-red-50", icon: "text-red-500", title: "text-red-800", body: "text-red-700" }
        : { box: "border-amber-200 bg-amber-50", icon: "text-amber-500", title: "text-amber-900", body: "text-amber-700" }
    const title = revoked ? "Công ty đã bị thu hồi xác minh" : "Công ty của bạn chưa được xác minh"
    const body = revoked ? REVOKED_BODY[variant](unverifyReason) : UNVERIFIED_BODY

    return (
        <section className={`flex items-start gap-3 rounded-2xl border p-5 ${tone.box}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`mt-0.5 shrink-0 ${tone.icon}`}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
            </svg>
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${tone.title}`}>{title}</p>
                <p className={`mt-0.5 text-sm [overflow-wrap:anywhere] ${tone.body}`}>{body}</p>
                {children}
            </div>
        </section>
    )
}

export default VerifyStatusBanner
