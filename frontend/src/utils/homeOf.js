//trang chủ theo role, dùng chung cho Direct (App.jsx) và ProtectedRoute để 2 nơi không lệch nhau
//(literal thay vì import ROUTE_PATH vì route.jsx là .jsx, test node không import được)
const HOME = { finder: "/finder/home", employer: "/employer/home", admin: "/admin/employers" }

const homeOf = (role) => HOME[role] || "/"

export default homeOf
