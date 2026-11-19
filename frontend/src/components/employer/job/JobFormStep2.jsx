import FormField from "../../shared/FormField"

const SALARY_TYPES = [
    { value: "Range", label: "Khoảng lương" },
    { value: "Negotiable", label: "Thỏa thuận" },
]

//Bước 2 "Lương và nội dung". Thỏa thuận ẩn 2 ô lương (hook tự xóa lỗi của chúng).
function JobFormStep2({ draft, errors, setField }) {
    const range = draft.salaryType === "Range"
    return (
        <>
            <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Mức lương</h2>
                <div className="mt-5 space-y-5">
                    <fieldset aria-describedby={errors.salaryType ? "field-salaryType-error" : undefined}>
                        <legend className="text-sm font-medium text-slate-700">Loại lương *</legend>
                        <div className="mt-1 flex gap-6">
                            {SALARY_TYPES.map((item) => (
                                <label key={item.value} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="radio" name="salaryType" value={item.value} checked={draft.salaryType === item.value}
                                        onChange={() => setField("salaryType", item.value)} className="h-4 w-4 accent-[#155DFC]" />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                        {errors.salaryType && <p id="field-salaryType-error" className="mt-1 text-xs text-red-600">{errors.salaryType}</p>}
                    </fieldset>

                    {range ? (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField label="Lương tối thiểu *" name="salaryMin" type="number" placeholder="Ví dụ: 15" value={draft.salaryMin} onChange={setField} error={errors.salaryMin} hint="Đơn vị: triệu đồng, từ 1 đến 999." />
                            <FormField label="Lương tối đa" name="salaryMax" type="number" placeholder="Ví dụ: 25" value={draft.salaryMax} onChange={setField} error={errors.salaryMax} hint="Để trống nếu không giới hạn trên. Chênh tối đa 20 triệu." />
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Ứng viên sẽ thấy mức lương là Thỏa thuận. Không cần nhập số tiền.</p>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Nội dung</h2>
                <div className="mt-5 space-y-5">
                    <FormField label="Kỹ năng" name="skillRequired" value={draft.skillRequired} onChange={setField} error={errors.skillRequired} hint="Cách nhau bằng dấu phẩy, tối đa 255 ký tự." />
                    <FormField label="Mô tả công việc *" name="description" type="textarea" rows={5} value={draft.description} onChange={setField} error={errors.description} hint="Tối đa 5000 ký tự." />
                    <FormField label="Yêu cầu ứng viên *" name="requirement" type="textarea" rows={5} value={draft.requirement} onChange={setField} error={errors.requirement} hint="Tối đa 5000 ký tự." />
                    <FormField label="Quyền lợi *" name="applicantBenefit" type="textarea" rows={5} value={draft.applicantBenefit} onChange={setField} error={errors.applicantBenefit} hint="Tối đa 5000 ký tự." />
                </div>
            </section>
        </>
    )
}

export default JobFormStep2
