import { getJobErrorMsg } from "../api/job.js"

// Hàm thuần cho hook useJobForm: lịch retry + phân loại lỗi khi gửi form tin tuyển dụng.

// Gửi lại cùng Idempotency-Key khi BE báo REQUEST_IN_PROGRESS (user chốt 2026-11-18)
export const RETRY_DELAYS_MS = [2000, 4000, 8000]

// attempt = số lần đã gửi lại (0 = chưa gửi lại lần nào); hết lịch trả null
export const getRetryDelay = (attempt) => RETRY_DELAYS_MS[attempt] ?? null

// Field thuộc bước 1 (khớp draft của JobValidate.validateJobStep1)
export const STEP1_FIELDS = [
    "jobTitle",
    "category",
    "subCategory",
    "location",
    "workType",
    "yearOfExperience",
    "numberOfPosition",
    "deadline",
]
export const STEP2_FIELDS = [
    "salaryType",
    "salaryMin",
    "salaryMax",
    "description",
    "requirement",
    "applicantBenefit",
    "skillRequired",
]
const KNOWN_FIELDS = [...STEP1_FIELDS, ...STEP2_FIELDS]

export const hasStep1Error = (errors) => STEP1_FIELDS.some((field) => errors[field])

// errors BE: { field: string[] } -> { field: string } cho field có trên form;
// phần còn lại (key lạ) gom vào extra để báo lỗi chung, không bỏ mất lỗi nào
const splitServerErrors = (serverErrors) => {
    const errors = {}
    const extra = []
    for (const [key, value] of Object.entries(serverErrors)) {
        const message = Array.isArray(value) ? value[0] : value
        if (KNOWN_FIELDS.includes(key)) errors[key] = message
        else if (message) extra.push(message)
    }
    return { errors, extra }
}

// Phân loại theo status + code (không so message). kind:
// validation | inProgress | keyReused | notEditable | notFound | other
export const classifySubmitError = (err) => {
    const status = err.response?.status
    const data = err.response?.data
    const message = getJobErrorMsg(err)
    const base = { kind: "other", errors: {}, step1: false, message }

    if (status === 400 && data?.code === "VALIDATION_ERROR" && data.errors) {
        const { errors, extra } = splitServerErrors(data.errors)
        //toàn key lạ: vẫn hiện câu cụ thể của BE
        if (Object.keys(errors).length === 0) return { ...base, message: extra.join(" ") || message }
        return { kind: "validation", errors, step1: hasStep1Error(errors), message: extra.join(" ") }
    }
    if (status === 409 && data?.code === "REQUEST_IN_PROGRESS") return { ...base, kind: "inProgress" }
    if (status === 409 && data?.code === "IDEMPOTENCY_KEY_REUSED") return { ...base, kind: "keyReused" }
    if (status === 409 && data?.code === "JOB_NOT_EDITABLE") return { ...base, kind: "notEditable" }
    if (status === 404) return { ...base, kind: "notFound" }
    return base
}

// Idempotency-Key: crypto.randomUUID chỉ có ở secure context (https/localhost), mở qua IP LAN http thì thiếu
// -> tự dựng UUID v4 từ getRandomValues (có ở mọi context)
export const newIdempotencyKey = (cryptoApi = globalThis.crypto) => {
    if (cryptoApi.randomUUID) return cryptoApi.randomUUID()
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Sau khi gửi thành công: form được mở từ đâu (state.from = "list" | "detail") và trang đích là gì.
// Trang trước đúng là đích thì navigate(-1) để history không lặp, còn lại thì replace
export const shouldGoBack = (from, mode) => from === (mode === "edit" ? "detail" : "list")
