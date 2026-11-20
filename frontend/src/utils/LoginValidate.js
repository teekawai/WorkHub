const validateLogin = ({email, password}) =>{
    if (!email) {
        return "Email không được để trống!"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Email không đúng định dạng!"
    }

    if (!password) {
        return "Mật khẩu không được để trống!"
    } else if (password.length < 8) {
        return "Mật khẩu cần ít nhất 8 ký tự!"
    }

}
export default validateLogin