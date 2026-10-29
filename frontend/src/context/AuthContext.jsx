import { createContext, useContext, useState } from "react"

//Nguồn chân lý DUY NHẤT cho currentUser trong toàn app — thay cho việc vừa giữ state ở App.jsx
//vừa có chỗ (ProtectedRoute) tự đọc thẳng localStorage, dễ lệch nhau sau khi login/logout.
//Mọi nơi cần đọc/ghi currentUser đều qua useAuth(), không đọc localStorage trực tiếp nữa.
const AuthContext = createContext(null)

function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("currentUser"))
        } catch {
            return null //localStorage có dữ liệu hỏng (JSON lỗi) thì coi như chưa đăng nhập, không crash app
        }
    })

    //gọi sau khi login/register thành công: ghi localStorage + cập nhật state cùng lúc, tránh lệch nhau
    const login = (user) => {
        localStorage.setItem("currentUser", JSON.stringify(user))
        setCurrentUser(user)
    }

    //gọi khi logout: xóa localStorage + reset state cùng lúc — đây là chỗ bug cũ (NavBar) thiếu bước setCurrentUser(null)
    const logout = () => {
        localStorage.removeItem("currentUser")
        setCurrentUser(null)
    }

    return <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>
}

function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth() phải được gọi bên trong <AuthProvider>")
    return ctx
}

export { AuthProvider, useAuth }
