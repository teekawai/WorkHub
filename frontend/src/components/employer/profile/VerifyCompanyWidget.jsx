import { useState } from "react"

//Widget trạng thái xác minh công ty (Bước 4 PLAN_FE_EmployerProfile.md). Không gọi API, chỉ đọc profile.isVerified
//(BE trả sẵn trong GET /employer/me).
//- isVerified = true: khối xanh "đã xác minh".
//- isVerified = false: khối vàng + nút "Verify now". Chưa có luồng verify thật nên bấm nút chỉ hiện câu
//  hướng dẫn liên hệ email để được xác minh thủ công.
//Đặt riêng trong trang EmployerProfile.jsx, không phải trong 3 Card.

const VERIFY_EMAIL = "123@gmail.com"

function VerifyCompanyWidget({ profile }) {
    const [showContact, setShowContact] = useState(false) //bấm Verify now thì hiện câu hướng dẫn

    if (profile?.isVerified) {
        return (
            <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-500">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4 12 14.01l-3-3" />
                </svg>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-900">Your company is verified</p>
                    <p className="mt-0.5 text-sm text-emerald-700">
                        A verified badge is shown on your job posts.
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-amber-500">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-900">Your company isn't verified yet</p>
                <p className="mt-0.5 text-sm text-amber-700">
                    Verified companies get a badge on their job posts and build more trust with candidates.
                </p>
                {showContact && (
                    <p role="status" className="mt-2 text-sm font-medium text-amber-900 [overflow-wrap:anywhere]">
                        Please contact{" "}
                        <a href={`mailto:${VERIFY_EMAIL}`} className="underline underline-offset-2">
                            {VERIFY_EMAIL}
                        </a>{" "}
                        to get your company verified.
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={() => setShowContact(true)}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
                Verify now
            </button>
        </section>
    )
}

export default VerifyCompanyWidget
