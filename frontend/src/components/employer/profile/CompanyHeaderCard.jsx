import defaultLogo from "../../../assets/avt-macdinh.webp" //chưa có logo mặc định riêng cho employer, dùng tạm ảnh avatar mặc định

//Component chỉ hiển thị: nhận profile từ GET /employer/me, không có state riêng, không gọi API.
//2 dòng dưới tên là suy ra từ field có sẵn (mục 1 PLAN_FE_EmployerProfile.md), không lưu riêng:
//- dòng phụ "Technology · Software Development" = 2 mục đầu của field (tách dấu phẩy)
//- tagline = câu đầu tiên của description (cắt tới dấu "." đầu, giới hạn độ dài phòng khi câu quá dài)

const TAGLINE_MAX = 140

const subline = (field) => {
    if (!field) return ""
    const parts = field.split(",").map((p) => p.trim()).filter(Boolean)
    return parts.slice(0, 2).join(" · ")
}

const tagline = (description) => {
    if (!description) return ""
    const firstSentence = description.split(".")[0].trim()
    if (!firstSentence) return ""
    return firstSentence.length > TAGLINE_MAX ? `${firstSentence.slice(0, TAGLINE_MAX).trim()}…` : firstSentence
}

const toHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
const stripProtocol = (url) => url.replace(/^https?:\/\//i, "")

//profile: { companyName, logo, field, description, website, email, ... } — xem shape đầy đủ trong api/employerProfile.js
//onEdit: bấm nút Edit. isEditing: true thì ẩn nút Edit (trang đang chuyển sang CompanyProfileForm)
function CompanyHeaderCard({ profile, onEdit, isEditing }) {
    const sub = subline(profile?.field)
    const tag = tagline(profile?.description)

    return (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
                    <img
                        src={profile?.logo || defaultLogo}
                        alt={`${profile?.companyName || "Company"} logo`}
                        className="size-16 shrink-0 rounded-xl border-2 border-white/30 bg-white/10 object-cover sm:size-20"
                    />
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                            {profile?.companyName || "Your company"}
                        </h1>
                        {sub && <p className="mt-1 text-sm font-medium text-blue-100">{sub}</p>}
                        {tag && <p className="mt-2 max-w-xl text-sm text-blue-50/90 [overflow-wrap:anywhere]">{tag}</p>}
                    </div>
                </div>

                {!isEditing && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="shrink-0 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                    >
                        Edit profile
                    </button>
                )}
            </div>

            {(profile?.website || profile?.email) && (
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-sm text-blue-50">
                    {profile?.website && (
                        <a
                            href={toHref(profile.website)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline [overflow-wrap:anywhere]"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            {stripProtocol(profile.website)}
                        </a>
                    )}
                    {profile?.email && (
                        <span className="inline-flex items-center gap-1.5 [overflow-wrap:anywhere]">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M22 7l-10 6L2 7" />
                            </svg>
                            {profile.email}
                        </span>
                    )}
                </div>
            )}
        </section>
    )
}

export default CompanyHeaderCard
