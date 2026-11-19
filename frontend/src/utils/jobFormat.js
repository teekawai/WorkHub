// Hàm hiển thị Job (thuần, không React). Ngày VN theo Business 1.6.
const VN_TZ = "Asia/Ho_Chi_Minh"

const VN_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
})

const dateParts = (date) => {
    const parts = VN_DATE_FORMAT.formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type).value
    return { year: get("year"), month: get("month"), day: get("day") }
}

// Hôm nay theo giờ VN, dạng yyyy-MM-dd
export const todayVn = (now = new Date()) => {
    const { year, month, day } = dateParts(now)
    return `${year}-${month}-${day}`
}

// Hết hạn xét trước Closed; deadline = hôm nay vẫn còn hạn (so chuỗi yyyy-MM-dd)
export const jobStatusLabel = (job, now = new Date()) => {
    if (job.deadline < todayVn(now)) return "Hết hạn"
    if (job.status === "Closed") return "Đã đóng"
    return "Đang mở"
}

const isWholeMillion = (vnd) => vnd % 1e6 === 0

// Tròn triệu -> số triệu; lẻ (dữ liệu cũ) -> đủ số VND vi-VN, không đơn vị. Không dùng "tỷ".
const millions = (vnd) => String(vnd / 1e6)
const exactVnd = (vnd) => vnd.toLocaleString("vi-VN")

export const formatSalary = ({ salaryType, salaryMin, salaryMax }) => {
    if (salaryType !== "Range" || salaryMin == null) return "Thỏa thuận"
    const minWhole = isWholeMillion(salaryMin)
    if (salaryMax == null || salaryMax === salaryMin) {
        const text = minWhole ? `${millions(salaryMin)} triệu` : exactVnd(salaryMin)
        return salaryMax == null ? `Từ ${text}` : text
    }
    const maxWhole = isWholeMillion(salaryMax)
    if (minWhole && maxWhole) return `${millions(salaryMin)}-${millions(salaryMax)} triệu`
    const minText = minWhole ? `${millions(salaryMin)} triệu` : exactVnd(salaryMin)
    const maxText = maxWhole ? `${millions(salaryMax)} triệu` : exactVnd(salaryMax)
    return `${minText}-${maxText}`
}

export const formatExperience = (years) =>
    years === 0 ? "Không yêu cầu kinh nghiệm" : `Từ ${years} năm`

// createdAt (ISO UTC có Z) -> dd/MM/yyyy theo ngày VN
export const formatDateVn = (iso) => {
    const { year, month, day } = dateParts(new Date(iso))
    return `${day}/${month}/${year}`
}

// deadline yyyy-MM-dd -> dd/MM/yyyy, chỉ tách chuỗi (không qua Date/múi giờ)
export const formatDeadline = (ymd) => {
    const [year, month, day] = ymd.split("-")
    return `${day}/${month}/${year}`
}

const WORK_TYPES = { Onsite: "Tại văn phòng", Remote: "Từ xa", Hybrid: "Kết hợp" }
export const workTypeLabel = (workType) => WORK_TYPES[workType] ?? workType
