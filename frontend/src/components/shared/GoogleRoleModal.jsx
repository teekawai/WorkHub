import { useEffect, useRef, useState } from "react"
import { GOOGLE_CLIENT_ID } from "../../constants/googleAuth"
import { googleAuth } from "../../api/auth"

//Modal chọn role trước khi đăng nhập/đăng ký bằng Google: chọn role TRƯỚC, rồi bấm nút Google để mở popup chọn tài khoản.
//Nút Google là nút THẬT do google.accounts.id.renderButton vẽ, để HIỂN THỊ bình thường (không opacity 0, không đè nút khác):
//khi origin đã đăng ký trong Google Console, GIS hiện nút cá nhân hóa (iframe accounts.google.com) có chống clickjacking —
//iframe trong suốt / bị che thì click bị bỏ qua (không popup, không lỗi). Kỹ thuật đè nút ẩn cũ chỉ chạy khi origin CHƯA đăng ký.
//
//QUAN TRỌNG: modal này KHÔNG được unmount khi đóng (không dùng `if (!open) return null` như ConfirmDialog) —
//chỉ ẩn bằng CSS. Lý do: initialize()+renderButton() chỉ được gọi ĐÚNG 1 LẦN lúc mount. Nếu để component
//unmount mỗi lần đóng rồi remount khi mở lại, div chứa iframe Google bị xoá khỏi DOM nhưng global state
//của window.google.accounts.id vẫn còn nhớ phiên cũ (không được cancel() để dọn) -> lệch trạng thái,
//gây lỗi "Cross-Origin-Opener-Policy ... postMessage" ở lần mở modal kế tiếp.
function GoogleRoleModal({ open, onClose, onAuthenticated, rememberMe = false }) {
    const [role, setRole] = useState("finder")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const googleBtnWrapRef = useRef(null)
    const roleRef = useRef(role) //callback của google.accounts.id được init 1 lần duy nhất lúc mount -> phải đọc role qua ref để tránh closure cũ
    const rememberMeRef = useRef(rememberMe)
    const handleCredentialResponseRef = useRef(null) //callback cũng phải đi qua ref vì initialize() chỉ gọi 1 lần nhưng hàm bên trong cần luôn là bản mới nhất

    useEffect(() => { roleRef.current = role }, [role])
    useEffect(() => { rememberMeRef.current = rememberMe }, [rememberMe])

    //reset lỗi cũ mỗi lần mở lại (không đụng tới GIS): chỉnh state ngay lúc render khi `open` đổi, cách React khuyên thay cho setState trong effect
    const [prevOpen, setPrevOpen] = useState(open)
    if (open !== prevOpen) {
        setPrevOpen(open)
        if (open) setError("")
    }

    const handleCredentialResponse = async (response) => {
        setLoading(true)
        setError("")
        try {
            const data = await googleAuth({
                token: response.credential,
                role: roleRef.current,
                rememberMe: rememberMeRef.current,
            })
            const currentUser = {
                userId: data.userId,
                email: data.email,
                avatar: data.avatar,
                role: data.role,
                accessToken: data.accessToken,
            }
            onAuthenticated(currentUser)
        } catch (e) {
            setError("Đăng nhập Google thất bại: " + (e.response?.data?.message || "vui lòng thử lại"))
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { handleCredentialResponseRef.current = handleCredentialResponse }) //cập nhật sau mỗi render (không ghi ref lúc render)

    //khởi tạo + render nút Google thật — CHỈ 1 LẦN khi component mount, không phụ thuộc `open`
    useEffect(() => {
        let cancelled = false
        let retryTimer = null

        const initGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleBtnWrapRef.current) return false

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (response) => handleCredentialResponseRef.current(response),
            })

            window.google.accounts.id.renderButton(googleBtnWrapRef.current, {
                type: "standard",
                theme: "filled_blue",
                size: "large",
                text: "continue_with",
                shape: "rectangular",
                logo_alignment: "left",
                locale: "vi",
                width: 320,
            })
            return true
        }

        //script GIS load bằng async defer nên có thể chưa sẵn sàng ngay lúc mount -> thử lại vài lần
        if (!initGoogleButton()) {
            retryTimer = setInterval(() => {
                if (cancelled) return
                if (initGoogleButton()) clearInterval(retryTimer)
            }, 300)
        }

        //dọn sạch khi trang/route thật sự unmount (chuyển Login <-> Register, logout...),
        //báo cho GIS biết phiên này kết thúc để tránh lệch state cho lần mount kế tiếp
        return () => {
            cancelled = true
            if (retryTimer) clearInterval(retryTimer)
            window.google?.accounts?.id?.cancel()
        }
    }, []) //chỉ chạy 1 lần duy nhất lúc mount

    //đóng modal bằng ESC cho tiện, không ảnh hưởng tới GIS vì không unmount
    useEffect(() => {
        if (!open) return
        const onKey = (e) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])


    return (
        <div
            className={
                open
                    ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
                    : "fixed inset-0 z-50 flex items-center justify-center invisible opacity-0 pointer-events-none"
            }
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="google-role-title"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="google-role-title" className="text-lg font-semibold text-[#111827]">
                    Bạn muốn tiếp tục với vai trò nào?
                </h2>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                    Chọn vai trò áp dụng nếu đây là lần đầu bạn dùng Google trên WorkHub.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                        { value: "finder", emoji: "🎓", label: "Người tìm việc" },
                        { value: "employer", emoji: "🏢", label: "Nhà tuyển dụng" },
                    ].map((item) => (
                        <div
                            key={item.value}
                            onClick={() => setRole(item.value)}
                            className={
                                role === item.value
                                    ? "relative cursor-pointer rounded-xl p-3.5 bg-[#155DFC]/5 border border-[#155DFC]/30 ring-4 ring-[#155DFC]/10 transition-all duration-200"
                                    : "relative cursor-pointer rounded-xl p-3.5 bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:border-[#D1D5DB]"
                            }
                        >
                            {role === item.value && (
                                <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-4 h-4 rounded-full bg-[#155DFC] text-white">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                            )}
                            <p className="text-xl">{item.emoji}</p>
                            <p className="mt-1 text-[14px] font-medium text-[#111827]">{item.label}</p>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <p className="text-[13px] text-red-700 leading-snug">{error}</p>
                    </div>
                )}

                {/* Nút Google thật, hiển thị bình thường (không đè, không trong suốt). Container render SẴN cả khi modal
                    đang ẩn (cha chỉ đổi class), nên nút không bị tháo khỏi DOM giữa các lần mở modal.
                    Đang gửi lên BE thì khóa click và làm mờ để không bấm 2 lần. */}
                <div
                    ref={googleBtnWrapRef}
                    aria-busy={loading}
                    className={`mt-5 flex min-h-11 justify-center ${loading ? "pointer-events-none opacity-60" : ""}`}
                />
                {loading && <p role="status" className="mt-2 text-center text-[13px] text-[#6B7280]">Đang xử lý...</p>}

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-2.5 h-9 text-[13.5px] text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                    Hủy
                </button>
            </div>
        </div>
    )
}

export default GoogleRoleModal
