import { workTypeLabel } from "../../../utils/jobFormat"
import { EXPERIENCE_LEVELS, SALARY_RANGES } from "../../../utils/jobSearch"

const SELECT = "rounded-lg border bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"

// 1 dropdown lọc; đã chọn thì viền đậm (Figma). all = nhãn mục "Tất cả ..." để bỏ riêng bộ lọc này
function FilterSelect({ label, all, value, onChange, choices, disabled }) {
    return (
        <select
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={`${SELECT} ${value ? "border-slate-900" : "border-slate-200"}`}
        >
            <option value="">{value ? all : label}</option>
            {choices.map(({ key, text }) => (
                <option key={key} value={key}>{text}</option>
            ))}
        </select>
    )
}

const asChoices = (list = []) => list.map((name) => ({ key: name, text: name }))

// Hàng dropdown + chip bộ lọc đang áp dụng. options = /jobs/options (null khi chưa tải).
function JobFilters({ filters, options, update, onClear }) {
    const subs = options?.categories.find((cat) => cat.name === filters.category)?.subCategories
    const chips = [
        { key: "category", text: filters.category },
        { key: "subCategory", text: filters.subCategory },
        { key: "location", text: filters.location },
        { key: "workType", text: filters.workType && workTypeLabel(filters.workType) },
        { key: "salary", text: SALARY_RANGES.find((item) => item.key === filters.salary)?.label },
        { key: "experience", text: EXPERIENCE_LEVELS.find((item) => item.key === filters.experience)?.label },
    ].filter((chip) => chip.text)

    return (
        <div>
            <div className="flex flex-wrap gap-3">
                <FilterSelect label="Ngành nghề" all="Tất cả ngành nghề" value={filters.category} onChange={(category) => update({ category })} choices={asChoices(options?.categories.map((cat) => cat.name))} />
                <FilterSelect label="Chuyên ngành" all="Tất cả chuyên ngành" value={filters.subCategory} onChange={(subCategory) => update({ subCategory })} choices={asChoices(subs)} disabled={!filters.category} />
                <FilterSelect label="Địa điểm" all="Tất cả địa điểm" value={filters.location} onChange={(location) => update({ location })} choices={asChoices(options?.locations)} />
                <FilterSelect label="Hình thức" all="Tất cả hình thức" value={filters.workType} onChange={(workType) => update({ workType })} choices={(options?.workTypes ?? []).map((type) => ({ key: type, text: workTypeLabel(type) }))} />
                <FilterSelect label="Mức lương" all="Tất cả mức lương" value={filters.salary} onChange={(salary) => update({ salary })} choices={SALARY_RANGES.map((item) => ({ key: item.key, text: item.label }))} />
                <FilterSelect label="Kinh nghiệm" all="Tất cả kinh nghiệm" value={filters.experience} onChange={(experience) => update({ experience })} choices={EXPERIENCE_LEVELS.map((item) => ({ key: item.key, text: item.label }))} />
            </div>
            {chips.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                        <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {chip.text}
                            <button type="button" aria-label={`Bỏ lọc ${chip.text}`} onClick={() => update({ [chip.key]: "" })} className="rounded-full px-1 text-slate-500 hover:text-slate-900">×</button>
                        </span>
                    ))}
                    <button type="button" onClick={onClear} className="px-2 text-xs font-medium text-slate-700 hover:text-[#155DFC]">Xóa bộ lọc</button>
                </div>
            )}
        </div>
    )
}

export default JobFilters
