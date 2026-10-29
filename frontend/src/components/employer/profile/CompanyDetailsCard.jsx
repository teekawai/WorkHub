//Component chỉ hiển thị: nhận profile, không có state riêng, không gọi API.
//Thứ tự đúng thiết kế chốt: Description (đủ, không cắt) → Founded Year → Tax Code.
//"ẩn mục nào trống" (mục Bước 4 PLAN_FE_EmployerProfile.md) — chỉ Description có thể trống thực tế,
//Founded Year/Tax Code là field bắt buộc nên luôn có khi profile đã tồn tại, nhưng vẫn ẩn phòng dữ liệu cũ thiếu.

function Row({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm text-slate-700 [overflow-wrap:anywhere]">{children}</dd>
        </div>
    )
}

function CompanyDetailsCard({ profile }) {
    const hasAny = !!(profile?.description || profile?.foundedYear || profile?.taxCode)

    return (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Company Details</h2>

            {hasAny ? (
                <dl className="mt-4 flex flex-col gap-4">
                    {profile?.description && (
                        <Row label="Description">
                            <p className="whitespace-pre-line leading-6">{profile.description}</p>
                        </Row>
                    )}
                    {profile?.foundedYear && <Row label="Founded Year">{profile.foundedYear}</Row>}
                    {profile?.taxCode && <Row label="Tax Code">{profile.taxCode}</Row>}
                </dl>
            ) : (
                <p className="mt-4 text-sm text-slate-400">No company details added yet.</p>
            )}
        </section>
    )
}

export default CompanyDetailsCard
