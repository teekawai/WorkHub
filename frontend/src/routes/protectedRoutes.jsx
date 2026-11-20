import { useEffect } from "react";
import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";
import { ROUTE_PATH } from "./route";
import { useAuth } from "../context/useAuth";
import homeOf from "../utils/homeOf";

const ROLE_LABEL = { finder: "ứng viên", employer: "nhà tuyển dụng", admin: "quản trị" }

//route này để làm cửa chặn cho các trang yêu cầu đăng nhập và đúng role:
//- chưa đăng nhập: về trang login (trang admin về login admin)
//- đăng nhập nhưng sai role: về trang home của role mình đang có (không render trang của role khác)
function ProtectedRoute({ children, role }) {
    //đọc currentUser từ AuthContext (nguồn chân lý duy nhất) thay vì tự JSON.parse(localStorage...) riêng ở đây —
    //trước đây đọc thẳng localStorage nên luôn "may mắn" đúng kể cả khi state App.jsx bị lệch (ví dụ logout thiếu bước setCurrentUser(null)),
    //nhưng giờ 2 nơi đã dùng chung 1 state nên không còn rủi ro lệch nữa.
    const { currentUser } = useAuth()
    const isLoggedIn = !!currentUser
    const isWrongRole = isLoggedIn && !!role && currentUser.role !== role

    //toast là side effect nên để trong useEffect, không gọi trực tiếp lúc render
    //id cố định để StrictMode (chạy effect 2 lần ở dev) không hiện 2 toast
    useEffect(() => {
        if (!isLoggedIn) {
            toast.error("Vui lòng đăng nhập để tiếp tục.", { id: "route-guard" })
        } else if (isWrongRole) {
            toast.error(
                `Bạn cần tài khoản ${ROLE_LABEL[role]} để truy cập trang này.`,
                { id: "route-guard" }
            )
        }
    }, [isLoggedIn, isWrongRole, role])

    if (!isLoggedIn) {
        return <Navigate to={role === "admin" ? ROUTE_PATH.ADMIN.LOGIN : ROUTE_PATH.AUTH.LOGIN} replace />
    }
    if (isWrongRole) {
        return <Navigate to={homeOf(currentUser.role)} replace />
    }
    return children
}
export default ProtectedRoute
