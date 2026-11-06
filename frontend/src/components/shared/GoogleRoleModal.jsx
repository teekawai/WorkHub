import { useEffect, useRef, useState } from "react"
import { GOOGLE_CLIENT_ID } from "../../constants/googleAuth"
import { googleAuth } from "../../api/auth"

//Modal chọn role trước khi đăng nhập/đăng ký bằng Google.
//Lý do không dùng nút Google "thật" (google.accounts.id.renderButton) để tự chạy flow luôn khi bấm nút custom:
//nút Google được Google render BÊN TRONG 1 iframe, trình duyệt không cho phép gọi .click() bằng JS lên nút
//trong iframe cross-origin đó (phải là 1 cú click thật của user). Nên kỹ thuật chuẩn là: vẫn render nút Google
//thật, nhưng để opacity 0 và đè (absolute) đúng lên trên nút "Tiếp tục với Google" custom của mình —
//user nhìn thấy/bấm vào nút custom, nhưng thực chất đang bấm trúng nút Google thật ở trên cùng layer.
//Vì vậy role phải được chọn TRƯỚC, rồi mới "bấm" (vào nút Google ẩn) để mở popup chọn tài khoản Google.
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
    handleCredentialResponseRef.current = handleCredentialResponse

    //khởi tạo + render nút Google thật (ẩn) — CHỈ 1 LẦN khi component mount, không phụ thuộc `open`
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
                theme: "outline",
                size: "large",
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

    useEffect(() => {
        if (open) setError("") //reset lỗi cũ mỗi lần mở lại, không đụng tới GIS
    }, [open])

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

                {/* Nút OK: lớp dưới là UI hiển thị, lớp trên (opacity 0) là nút Google thật nhận click.
                    Container này được render SẴN ngay cả khi modal đang ẩn (cha chỉ bị className="hidden"),
                    nên nút Google thật bên trong KHÔNG bao giờ bị tháo khỏi DOM giữa các lần mở modal. */}
                <div className="relative mt-5 h-11 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        tabIndex={-1}
                        className="pointer-events-none absolute inset-0 w-full h-11 rounded-xl bg-[#155DFC] text-white text-[15px] font-medium flex items-center justify-center gap-2"
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" /><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.3C40.8 36.4 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" /></svg>
                        {loading ? "Đang xử lý..." : "Tiếp tục với Google"}
                    </button>
                    <div ref={googleBtnWrapRef} className="absolute inset-0 opacity-0 [&>div]:!w-full [&>div]:!h-full" />
                </div>

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
