//Validate form hồ sơ Finder. Nhận draft (toàn chuỗi), trả về object lỗi { tênField: "message" }.
//Object rỗng nghĩa là hợp lệ. Dùng chung cho cả tạo mới lẫn sửa (BE: PUT /finders/me chỉ bắt buộc Fullname, Phone).

//đúng 10 ký tự, mỗi ký tự là chữ số 0-9 (\d trong JS chỉ khớp 0-9 nên "1e5", "+84", dấu cách, dấu - đều bị loại)
const PHONE_REGEX = /^\d{10}$/

const validateFinderProfile = (draft) => {
    const errors = {}

    if (!draft.fullname.trim()) {
        errors.fullname = "Full name is required."
    }

    const phone = draft.phone.trim()
    if (!phone) {
        errors.phone = "Phone number is required."
    } else if (!PHONE_REGEX.test(phone)) {
        errors.phone = "Phone number must be exactly 10 digits (numbers only)."
    }

    return errors
}

export default validateFinderProfile
