import { createContext, useCallback, useContext, useState } from "react"

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

    //cập nhật 1 phần thông tin user (vd avatar sau khi upload). Đọc lại localStorage thay vì dùng state
    //vì interceptor (api/instance.js) có thể vừa ghi accessToken mới vào localStorage mà state chưa biết
    //useCallback: hàm ổn định giữa các lần render -> dùng được trong deps của useEffect mà không bị chạy lặp
    const updateUser = useCallback((patch) => {
        let stored = null
        try {
            stored = JSON.parse(localStorage.getItem("currentUser"))
        } catch {
            stored = null
        }
        if (!stored) return //đã logout thì thôi
        if (Object.keys(patch).every((k) => stored[k] === patch[k])) return //không đổi gì thì khỏi re-render cả app
        const next = { ...stored, ...patch }
        localStorage.setItem("currentUser", JSON.stringify(next))
        setCurrentUser(next)
    }, [])

    //gọi khi logout: xóa localStorage + reset state cùng lúc — đây là chỗ bug cũ (NavBar) thiếu bước setCurrentUser(null)
    const logout = () => {
        localStorage.removeItem("currentUser")
        setCurrentUser(null)
    }

    return <AuthContext.Provider value={{ currentUser, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth() phải được gọi bên trong <AuthProvider>")
    return ctx
}

export { AuthProvider, useAuth }
