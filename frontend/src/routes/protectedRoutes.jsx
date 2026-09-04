import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";

//route này để làm cửa chặn cho 1 số chức năng yêu cầu đăng nhập,
//chưa đăng nhập thì nhảy về trang login
function ProtectedRoute({children, role}){
    const currentUser = JSON.parse(localStorage.getItem("currentUser"))
    if(!currentUser){
        setTimeout(() => toast.warning("Bạn cần đăng nhập để sử dụng chức năng này!"),2000)
        return <Navigate to="/login" replace></Navigate>
    } else{
        if(role !== currentUser.role){
            setTimeout(() => toast.warning(`Bạn cần là ${role ==="finder" ?"Người tìm việc": "Nhà tuyển dụng"} để sử dụng chức năng này!`),2000)
        }
    }
    return children
}
export default ProtectedRoute