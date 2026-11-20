// Validate form Job 2 bước + chuyển draft <-> body API. Mirror backend/Services/jobs/JobRequestValidator.cs.
// Draft toàn chuỗi; lương trong draft tính bằng TRIỆU (nguyên 1-999), body gửi BE bằng VND.
// Hàm validate trả { tênField: "message" }, object rỗng = hợp lệ. Chỉ gọi khi đã có options.

const REQUIRED = "Không được bỏ trống"
const INVALID = "Giá trị không hợp lệ"
const MILLION = 1_000_000
export const MAX_DEADLINE_DAYS = 90
const MAX_SALARY_GAP = 20 // triệu, max - min tối đa (user chốt 2026-11-17)
const INT_REGEX = /^-?\d+$/ // chặn "", " ", "1e1", "0x10", "12abc", "1.5" (Number() sẽ cho qua)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const emptyJobDraft = {
    jobTitle: "",
    category: "",
    subCategory: "",
    location: "",
    workType: "",
    skillRequired: "",
    description: "",
    requirement: "",
    applicantBenefit: "",
    salaryType: "Range",
    salaryMin: "",
    salaryMax: "",
    yearOfExperience: "",
    numberOfPosition: "",
    deadline: "",
}

const trim = (value) => (value ?? "").trim()

const checkText = (errors, draft, key, maxLength, required) => {
    const text = trim(draft[key])
    if (!text) {
        if (required) errors[key] = REQUIRED
    } else if (text.length > maxLength) errors[key] = `Tối đa ${maxLength} ký tự`
}

const checkOption = (errors, key, value, list) => {
    const text = trim(value)
    if (!text) errors[key] = REQUIRED
    else if (!list.includes(text)) errors[key] = INVALID
}

// Trả số nguyên hợp lệ trong [min, max], ngược lại ghi lỗi và trả null
const checkInt = (errors, key, value, min, max, required, outOfRange) => {
    const text = trim(value)
    if (!text) {
        if (required) errors[key] = REQUIRED
        return null
    }
    if (!INT_REGEX.test(text)) {
        errors[key] = INVALID
        return null
    }
    const num = Number(text)
    if (num < min || num > max) {
        errors[key] = outOfRange
        return null
    }
    return num
}

// Cộng ngày trên chuỗi yyyy-MM-dd bằng UTC thuần, không dính múi giờ máy
export const addDays = (dateStr, days) => {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

// Ngày có thật: Date.UTC trôi ngày (2026-02-30 -> 03-02) thì chuỗi không khớp lại
const isRealDate = (text) => DATE_REGEX.test(text) && addDays(text, 0) === text

export const validateJobStep1 = (draft, options, today) => {
    const errors = {}

    checkText(errors, draft, "jobTitle", 255, true)

    const categories = options?.categories ?? []
    checkOption(errors, "category", draft.category, categories.map((category) => category.name))
    const subCategory = trim(draft.subCategory)
    if (!errors.category && subCategory) {
        const subs = categories.find((category) => category.name === trim(draft.category))?.subCategories ?? []
        if (!subs.includes(subCategory)) errors.subCategory = INVALID
    }

    checkOption(errors, "location", draft.location, options?.locations ?? [])
    checkOption(errors, "workType", draft.workType, options?.workTypes ?? [])

    checkInt(errors, "yearOfExperience", draft.yearOfExperience, 0, 50, true, "Phải từ 0 đến 50")
    checkInt(errors, "numberOfPosition", draft.numberOfPosition, 1, 50, true, "Phải từ 1 đến 50")

    const deadline = trim(draft.deadline)
    if (!deadline) errors.deadline = REQUIRED
    else if (!isRealDate(deadline)) errors.deadline = INVALID
    else if (deadline < today || deadline > addDays(today, MAX_DEADLINE_DAYS)) {
        errors.deadline = `Phải từ hôm nay đến ${MAX_DEADLINE_DAYS} ngày tới`
    }

    return errors
}

export const validateJobStep2 = (draft) => {
    const errors = {}

    if (!draft.salaryType) errors.salaryType = REQUIRED
    else if (draft.salaryType === "Range") {
        const min = checkInt(errors, "salaryMin", draft.salaryMin, 1, 999, true, "Phải từ 1 đến 999")
        const max = checkInt(errors, "salaryMax", draft.salaryMax, 1, 999, false, "Phải từ 1 đến 999")
        if (min !== null && max !== null) {
            if (min > max) errors.salaryMax = "Phải lớn hơn hoặc bằng lương tối thiểu"
            else if (max - min > MAX_SALARY_GAP) errors.salaryMax = `Không được cao hơn lương tối thiểu quá ${MAX_SALARY_GAP} triệu`
        }
    } else if (draft.salaryType !== "Negotiable") errors.salaryType = INVALID

    checkText(errors, draft, "description", 5000, true)
    checkText(errors, draft, "requirement", 5000, true)
    checkText(errors, draft, "applicantBenefit", 5000, true)
    checkText(errors, draft, "skillRequired", 255, false)

    return errors
}

const str = (value) => (value == null ? "" : String(value))
const millions = (vnd) => (vnd == null ? "" : String(vnd / MILLION)) // lẻ giữ nguyên ("15.5"), để validate báo lỗi

// Job từ API -> draft cho form. repost: để trống deadline (Business 2.5)
export const jobToDraft = (job, { repost = false } = {}) => ({
    jobTitle: str(job.jobTitle),
    category: str(job.category),
    subCategory: str(job.subCategory),
    location: str(job.location),
    workType: str(job.workType),
    skillRequired: str(job.skillRequired),
    description: str(job.description),
    requirement: str(job.requirement),
    applicantBenefit: str(job.applicantBenefit),
    salaryType: str(job.salaryType),
    salaryMin: millions(job.salaryMin),
    salaryMax: millions(job.salaryMax),
    yearOfExperience: str(job.yearOfExperience),
    numberOfPosition: str(job.numberOfPosition),
    deadline: repost ? "" : str(job.deadline),
})

const orNull = (value) => trim(value) || null
const vnd = (value) => (trim(value) ? Number(trim(value)) * MILLION : null)
const orNumber = (value) => (trim(value) ? Number(trim(value)) : null) // rỗng -> null, không thành 0

// Draft đã validate -> body POST/PUT /api/jobs (đúng 15 field của JobRequestDTO)
export const draftToBody = (draft) => {
    const range = draft.salaryType === "Range"
    return {
        jobTitle: trim(draft.jobTitle),
        category: trim(draft.category),
        subCategory: orNull(draft.subCategory),
        location: trim(draft.location),
        workType: trim(draft.workType),
        skillRequired: orNull(draft.skillRequired),
        description: trim(draft.description),
        requirement: trim(draft.requirement),
        applicantBenefit: trim(draft.applicantBenefit),
        salaryType: draft.salaryType,
        salaryMin: range ? vnd(draft.salaryMin) : null,
        salaryMax: range ? vnd(draft.salaryMax) : null,
        yearOfExperience: orNumber(draft.yearOfExperience),
        numberOfPosition: orNumber(draft.numberOfPosition),
        deadline: trim(draft.deadline),
    }
}
