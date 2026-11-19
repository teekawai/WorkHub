import FormField from "../../shared/FormField"
import { addDays, MAX_DEADLINE_DAYS } from "../../../utils/JobValidate"
import { formatDeadline, workTypeLabel } from "../../../utils/jobFormat"

//Ô chọn tự viết (FormField chỉ có text/textarea/number). items: [{ value, label }]
function SelectField({ label, name, value, onChange, error, hint, items, placeholder, disabled = false }) {
    const id = `field-${name}`
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
            {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-slate-400">{hint}</p>}
            <select
                id={id}
                name={name}
                value={value}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={describedBy}
                onChange={(e) => onChange(name, e.target.value)}
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#155DFC] focus:ring-1 focus:ring-[#155DFC] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${error ? "border-red-400" : "border-slate-300"} ${value ? "text-slate-900" : "text-slate-400"}`}
            >
                <option value="">{placeholder}</option>
                {/* giá trị cũ không còn trong danh sách (tin cũ): vẫn hiện đúng và đổi được */}
                {value && !items.some((item) => item.value === value) && <option value={value}>{value}</option>}
                {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    )
}

const toItems = (list = []) => list.map((value) => ({ value, label: value }))

//Bước 1 "Thông tin chung". today: yyyy-MM-dd (giờ VN). oldDeadline: chỉ có khi đăng lại.
function JobFormStep1({ draft, errors, options, setField, today, oldDeadline }) {
    const subs = options.categories.find((category) => category.name === draft.category)?.subCategories ?? []
    const maxDeadline = addDays(today, MAX_DEADLINE_DAYS)
    const range = `Từ hôm nay đến ${formatDeadline(maxDeadline)}.`
    const deadlineHint = oldDeadline && oldDeadline < today
        ? `Hạn cũ ${formatDeadline(oldDeadline)} đã qua, chọn hạn mới. ${range}`
        : range

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Thông tin chung</h2>
            <div className="mt-5 space-y-5">
                <FormField label="Tiêu đề tin *" placeholder="Ví dụ: Lập trình viên Backend .NET" name="jobTitle" value={draft.jobTitle} onChange={setField} error={errors.jobTitle} />
                <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField label="Ngành nghề *" name="category" value={draft.category} onChange={setField} error={errors.category}
                        hint="Chọn ngành nghề trước, rồi đến chuyên ngành." placeholder="Chọn ngành nghề" items={toItems(options.categories.map((category) => category.name))} />
                    <SelectField label="Chuyên ngành" name="subCategory" value={draft.subCategory} onChange={setField} error={errors.subCategory}
                        hint="Không bắt buộc." placeholder={draft.category ? "Không chọn" : "Chọn ngành nghề trước"} disabled={!draft.category} items={toItems(subs)} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField label="Địa điểm *" name="location" value={draft.location} onChange={setField} error={errors.location}
                        placeholder="Chọn tỉnh, thành" items={toItems(options.locations)} />
                    <SelectField label="Hình thức làm việc *" name="workType" value={draft.workType} onChange={setField} error={errors.workType}
                        placeholder="Chọn hình thức" items={options.workTypes.map((value) => ({ value, label: workTypeLabel(value) }))} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Kinh nghiệm (năm) *" name="yearOfExperience" type="number" placeholder="Ví dụ: 2" value={draft.yearOfExperience} onChange={setField} error={errors.yearOfExperience} hint="Nhập 0 nếu không yêu cầu." />
                    <FormField label="Số lượng tuyển *" name="numberOfPosition" type="number" placeholder="Ví dụ: 1" value={draft.numberOfPosition} onChange={setField} error={errors.numberOfPosition} hint="Từ 1 đến 50 người." />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Hạn nộp *" name="deadline" type="date" value={draft.deadline} onChange={setField} error={errors.deadline} hint={deadlineHint} min={today} max={maxDeadline} />
                </div>
            </div>
        </section>
    )
}

export default JobFormStep1
