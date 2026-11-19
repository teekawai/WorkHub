import { createContext } from "react"

//tách khỏi AuthContext.jsx để file đó chỉ export component (fast refresh của Vite)
export const AuthContext = createContext(null)
