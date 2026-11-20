import { useContext } from "react"
import { AuthContext } from "./authState"

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth() phải được gọi bên trong <AuthProvider>")
    return ctx
}
