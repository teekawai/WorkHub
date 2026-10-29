//Validate form hồ sơ Employer. Nhận draft (toàn chuỗi), trả về object lỗi { tênField: "message" }.
//Object rỗng nghĩa là hợp lệ. Field bắt buộc theo ERD (mục 2 PLAN_FE_EmployerProfile.md):
//companyName, address, field, foundedYear, phone, taxCode. description/website để trống được.

const PHONE_REGEX = /^0\d{9,10}$/ //10-11 chữ số, bắt đầu bằng 0 (khớp với BE)
const TAX_REGEX = /^\d{10}(-\d{3}|\d{3})?$/ //10 hoặc 13 chữ số MST Việt Nam (khớp với BE)
const URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i //bắt đầu bằng http:// hoặc https://
const CURRENT_YEAR = new Date().getFullYear()

const validateEmployerProfile = (draft) => {
    const errors = {}

    if (!draft.companyName?.trim()) {
        errors.companyName = "Company name is required."
    } else if (draft.companyName.trim().length > 100) {
        errors.companyName = "Company name must not exceed 100 characters."
    }

    if (!draft.address?.trim()) {
        errors.address = "Address is required."
    } else if (draft.address.trim().length > 255) {
        errors.address = "Address must not exceed 255 characters."
    }

    if (!draft.field?.trim()) {
        errors.field = "Field is required."
    } else if (draft.field.trim().length > 50) {
        errors.field = "Field must not exceed 50 characters."
    }

    const phone = draft.phone?.trim() || ""
    if (!phone) {
        errors.phone = "Phone number is required."
    } else if (!PHONE_REGEX.test(phone)) {
        errors.phone = "Phone number must be 10-11 digits and start with 0."
    }

    const tax = draft.taxCode?.trim() || ""
    if (!tax) {
        errors.taxCode = "Tax code is required."
    } else if (!TAX_REGEX.test(tax)) {
        errors.taxCode = "Tax code must be 10 or 13 digits (format 10 or 10-3)."
    }

    const yearRaw = draft.foundedYear?.trim() || ""
    if (!yearRaw) {
        errors.foundedYear = "Founded year is required."
    } else {
        const yearNum = Number(yearRaw)
        if (!/^\d{4}$/.test(yearRaw) || yearNum < 1800 || yearNum > CURRENT_YEAR) {
            errors.foundedYear = `Founded year must be between 1800 and ${CURRENT_YEAR}.`
        }
    }

    const website = draft.website?.trim() || ""
    if (website && !URL_REGEX.test(website)) {
        errors.website = "Website must be a valid URL starting with http:// or https://."
    }

    return errors
}

export default validateEmployerProfile
