// Hàm thuần của trang Tìm việc: bộ lọc <-> URL query <-> params gửi BE (Business 1.3, 1.4.1, 6.x).
import { todayVn } from "./jobFormat.js"

// 6 cặp lương BE chấp nhận (Business 1.3). Cặp cuối chặn trên 1 tỷ.
export const SALARY_RANGES = [
    { key: "0-10", label: "Dưới 10 triệu", min: 0, max: 10_000_000 },
    { key: "10-15", label: "10–15 triệu", min: 10_000_000, max: 15_000_000 },
    { key: "15-20", label: "15–20 triệu", min: 15_000_000, max: 20_000_000 },
    { key: "20-30", label: "20–30 triệu", min: 20_000_000, max: 30_000_000 },
    { key: "30-50", label: "30–50 triệu", min: 30_000_000, max: 50_000_000 },
    { key: "50+", label: "Trên 50 triệu", min: 50_000_000, max: 1_000_000_000 },
]

// Mã `experience` BE nhận (Business 1.4.1)
export const EXPERIENCE_LEVELS = [
    { key: "none", label: "Không yêu cầu kinh nghiệm" },
    { key: "1-3", label: "1–3 năm" },
    { key: "3-5", label: "3–5 năm" },
    { key: "5-10", label: "5–10 năm" },
    { key: "10+", label: "Từ 10 năm" },
]

export const SORT_OPTIONS = [
    { key: "newest", label: "Mới nhất" },
    { key: "salary_desc", label: "Lương cao nhất" },
]

export const KEYWORD_MAX = 255

const TEXT_KEYS = ["keyword", "category", "subCategory", "location", "workType"]
const has = (list, key) => list.some((item) => item.key === key)

// URLSearchParams -> bộ lọc đầy đủ; giá trị lạ bị bỏ (BE sẽ 400 nếu gửi lên).
// options (/jobs/options) có thì bỏ luôn ngành/chuyên ngành/địa điểm/hình thức không còn trong danh sách -> link cũ không kẹt 400.
export const parseSearchQuery = (searchParams, options = null) => {
    const filters = {}
    for (const key of TEXT_KEYS) filters[key] = (searchParams.get(key) ?? "").trim()
    filters.keyword = filters.keyword.slice(0, KEYWORD_MAX)
    if (options) {
        const category = options.categories.find((item) => item.name === filters.category)
        if (!category) filters.category = ""
        if (!category?.subCategories.includes(filters.subCategory)) filters.subCategory = ""
        if (!options.locations.includes(filters.location)) filters.location = ""
        if (!options.workTypes.includes(filters.workType)) filters.workType = ""
    }
    if (!filters.category) filters.subCategory = "" // chuyên ngành phải đi kèm ngành
    const salary = searchParams.get("salary")
    const experience = searchParams.get("experience")
    const sortBy = searchParams.get("sortBy")
    const page = Number(searchParams.get("page"))
    return {
        ...filters,
        salary: has(SALARY_RANGES, salary) ? salary : "",
        experience: has(EXPERIENCE_LEVELS, experience) ? experience : "",
        sortBy: has(SORT_OPTIONS, sortBy) ? sortBy : "newest",
        page: Number.isInteger(page) && page >= 1 ? page : 1,
    }
}

// Bộ lọc -> URLSearchParams (tự encode, 10+ -> 10%2B). Bỏ giá trị rỗng/mặc định.
export const buildSearchParams = (filters = {}) => {
    const query = new URLSearchParams()
    for (const key of [...TEXT_KEYS, "salary", "experience"]) {
        const value = String(filters[key] ?? "").trim()
        if (value) query.set(key, value)
    }
    if (filters.sortBy && filters.sortBy !== "newest") query.set("sortBy", filters.sortBy)
    if (filters.page > 1) query.set("page", String(filters.page))
    return query
}

export const buildSearchUrl = (filters = {}) => {
    const text = buildSearchParams(filters).toString()
    return text ? `/jobs?${text}` : "/jobs"
}

// Bộ lọc -> params gọi BE. Không gửi limit trừ khi truyền (BE mặc định 30).
export const toApiParams = (filters, { limit } = {}) => {
    const params = { sortBy: filters.sortBy, page: filters.page }
    for (const key of TEXT_KEYS) if (filters[key]) params[key] = filters[key].trim()
    const range = SALARY_RANGES.find((item) => item.key === filters.salary)
    if (range) {
        params.salaryMin = range.min // gửi cả 2 đầu, kể cả 0
        params.salaryMax = range.max
    }
    if (filters.experience) params.experience = filters.experience
    if (limit) params.limit = limit
    return params
}

const DAY_MS = 86_400_000
const dayNumber = (ymd) => Date.parse(`${ymd}T00:00:00Z`) / DAY_MS

// Ngày đăng tương đối theo ngày lịch VN (không chia 24h). Ngưỡng: <7 ngày, <30 ngày = tuần, còn lại = tháng.
export const timeAgo = (iso, now = new Date()) => {
    const days = Math.max(0, dayNumber(todayVn(now)) - dayNumber(todayVn(new Date(iso)))) // tương lai -> Hôm nay
    if (days === 0) return "Hôm nay"
    if (days === 1) return "Hôm qua"
    if (days < 7) return `${days} ngày trước`
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`
    return `${Math.floor(days / 30)} tháng trước`
}

// Chữ viết tắt cho khung logo khi công ty chưa có ảnh: chữ cái đầu của 2 từ cuối ("Giải pháp Mây Xanh" -> "MX")
export const companyInitials = (name = "") =>
    name.trim().split(/\s+/).slice(-2).map((word) => word[0]?.toUpperCase() ?? "").join("")
