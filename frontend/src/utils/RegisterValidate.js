const validate = ({ username, password, email, role, agreeTerms }) => {
    if (!email) {
        return "Email không được để trống!"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Email không đúng định dạng!"
    }

    if (!password) {
        return "Password không được để trống!"
    } else if (password.length < 6) {
        return "Mật khẩu cần ít nhất 6 ký tự!"
    }

    if (!username) {
        return role === "finder" ? "Họ tên không được để trống!" : "Tên công ty không được để trống!"
    } else if (username.length > 50) {
        return "Tên không được dài quá 50 ký tự!"
    }

    if (!role) {
        return "Hãy chọn vai trò của bạn!"
    } else if (role != "finder" && role != "employer") {
        return "Bạn cần chọn đúng role của mình!"
    }

    if (!agreeTerms) {
        return "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật!"
    }
}

export default validate
