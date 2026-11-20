//Phần giao diện dùng chung giữa danh sách tin (MyJobs) và chi tiết tin (MyJobDetail)
//Màu badge trạng thái, dùng kèm class "border"
export const BADGE_CLASS = {
    "Đang mở": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Đã đóng": "border-slate-200 bg-slate-100 text-slate-600",
    "Hết hạn": "border-amber-200 bg-amber-50 text-amber-700",
}

//Props cho ConfirmDialog đóng / xóa tin
export const CLOSE_DIALOG = {
    title: "Đóng tin tuyển dụng?",
    message: "Ứng viên sẽ không còn thấy tin này và tin không thể mở lại. Muốn tuyển tiếp, hãy dùng Đăng lại.",
    yesLabel: "Đóng tin",
    noLabel: "Hủy",
}
export const DELETE_DIALOG = {
    title: "Xóa tin tuyển dụng?",
    message: "Xóa tin sẽ xóa luôn các đơn ứng tuyển. Thao tác này không thể hoàn tác.",
    yesLabel: "Xóa",
    noLabel: "Hủy",
    danger: true,
}
