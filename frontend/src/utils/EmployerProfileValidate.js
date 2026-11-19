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
        errors.companyName = "Vui lòng nhập tên công ty."
    } else if (draft.companyName.trim().length > 100) {
        errors.companyName = "Tên công ty không được dài quá 100 ký tự."
    }

    if (!draft.address?.trim()) {
        errors.address = "Vui lòng nhập địa chỉ."
    } else if (draft.address.trim().length > 255) {
        errors.address = "Địa chỉ không được dài quá 255 ký tự."
    }

    if (!draft.field?.trim()) {
        errors.field = "Vui lòng nhập lĩnh vực hoạt động."
    } else if (draft.field.trim().length > 50) {
        errors.field = "Lĩnh vực hoạt động không được dài quá 50 ký tự."
    }

    const phone = draft.phone?.trim() || ""
    if (!phone) {
        errors.phone = "Vui lòng nhập số điện thoại."
    } else if (!PHONE_REGEX.test(phone)) {
        errors.phone = "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0."
    }

    const tax = draft.taxCode?.trim() || ""
    if (!tax) {
        errors.taxCode = "Vui lòng nhập mã số thuế."
    } else if (!TAX_REGEX.test(tax)) {
        errors.taxCode = "Mã số thuế phải gồm 10 hoặc 13 chữ số (định dạng 10 hoặc 10-3)."
    }

    const yearRaw = draft.foundedYear?.trim() || ""
    if (!yearRaw) {
        errors.foundedYear = "Vui lòng nhập năm thành lập."
    } else {
        const yearNum = Number(yearRaw)
        if (!/^\d{4}$/.test(yearRaw) || yearNum < 1800 || yearNum > CURRENT_YEAR) {
            errors.foundedYear = `Năm thành lập phải nằm trong khoảng 1800 đến ${CURRENT_YEAR}.`
        }
    }

    const website = draft.website?.trim() || ""
    if (website && !URL_REGEX.test(website)) {
        errors.website = "Website phải là đường dẫn hợp lệ, bắt đầu bằng http:// hoặc https://."
    }

    return errors
}

export default validateEmployerProfile
