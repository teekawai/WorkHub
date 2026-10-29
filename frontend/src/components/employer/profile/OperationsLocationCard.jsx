//Component chỉ hiển thị: nhận profile, không có state riêng, không gọi API.
//Thứ tự đúng thiết kế chốt: Address (+ "View on map" optional) → Field (hiển thị nguyên chuỗi phẩy) → Phone.
//"View on map": chỉ mở Google Maps ở tab mới bằng URL search theo address, không gọi BE (đúng mục Bước 4).

function Row({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm text-slate-700 [overflow-wrap:anywhere]">{children}</dd>
        </div>
    )
}

function OperationsLocationCard({ profile }) {
    const hasAny = !!(profile?.address || profile?.field || profile?.phone)

    return (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Operations &amp; Location</h2>

            {hasAny ? (
                <dl className="mt-4 flex flex-col gap-4">
                    {profile?.address && (
                        <Row label="Address">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>{profile.address}</span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
                                >
                                    View on map
                                </a>
                            </div>
                        </Row>
                    )}
                    {profile?.field && <Row label="Field">{profile.field}</Row>}
                    {profile?.phone && <Row label="Phone">{profile.phone}</Row>}
                </dl>
            ) : (
                <p className="mt-4 text-sm text-slate-400">No location details added yet.</p>
            )}
        </section>
    )
}

export default OperationsLocationCard
