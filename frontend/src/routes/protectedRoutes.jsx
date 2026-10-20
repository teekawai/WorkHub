import { useEffect } from "react";
import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";
import { ROUTE_PATH } from "./route";

//route này để làm cửa chặn cho các trang yêu cầu đăng nhập và đúng role:
//- chưa đăng nhập: về trang login
//- đăng nhập nhưng sai role: về trang home của role mình đang có (không render trang của role khác)
function ProtectedRoute({ children, role }) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"))
    const isLoggedIn = !!currentUser
    const isWrongRole = isLoggedIn && !!role && currentUser.role !== role

    //toast là side effect nên để trong useEffect, không gọi trực tiếp lúc render
    //id cố định để StrictMode (chạy effect 2 lần ở dev) không hiện 2 toast
    useEffect(() => {
        if (!isLoggedIn) {
            toast.error("Please sign in to continue.", { id: "route-guard" })
        } else if (isWrongRole) {
            toast.error(
                `You need ${role === "finder" ? "a finder" : "an employer"} account to access this page.`,
                { id: "route-guard" }
            )
        }
    }, [isLoggedIn, isWrongRole, role])

    if (!isLoggedIn) {
        return <Navigate to={ROUTE_PATH.AUTH.LOGIN} replace />
    }
    if (isWrongRole) {
        const home = currentUser.role === "employer" ? ROUTE_PATH.EMPLOYER.HOME : ROUTE_PATH.FINDER.HOME
        return <Navigate to={home} replace />
    }
    return children
}
export default ProtectedRoute
