const validateLogin = ({email, password}) =>{
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

}
export default validateLogin