import { useRef } from "react"
import FormField from "../../shared/FormField"
import defaultLogo from "../../../assets/avt-macdinh.webp" //giống CompanyHeaderCard — chưa có ảnh mặc định riêng cho logo

//Form chế độ sửa. Chỉ nhận draft/errors/onChange từ ngoài (từ useEmployerProfile), không tự gọi API —
//kể cả logo cũng không tự validate/upload ở đây: bấm chọn file xong gọi thẳng logo.onPick(file),
//việc kiểm tra đuôi/dung lượng + gọi uploadLogo nằm trong hook (handleLogoPick).
//
//props:
//  profile: hồ sơ hiện tại (dùng để lấy email readonly + logo hiện có) — có thể null khi tạo mới
//  draft, errors, onChange: y hệt FormField cần (onChange(name, value))
//  logo: { canChange, busy, error, onPick(file) } — canChange luôn true (EmployerProfile đã tự tạo hồ sơ trước nếu chưa có); error = lỗi upload gần nhất (chuỗi rỗng nếu không có)
function CompanyProfileForm({ profile, draft, errors, onChange, logo }) {
    const logoInput = useRef(null)
    //đã verify thì BE khóa companyName + taxCode (định danh pháp lý đã xác minh) -> FE để readonly cho khớp
    const verified = !!profile?.isVerified
    const lockedHint = verified ? "Đã xác minh — liên hệ hỗ trợ nếu cần thay đổi." : undefined

    return (
        <div className="flex flex-col gap-6">
            {/* Logo: bấm vào ảnh khi đang edit để đổi, giống avatar bên Finder */}
            <div className="flex items-center gap-4">
                <div className="group relative size-20 shrink-0">
                    <img
                        src={profile?.logo || defaultLogo}
                        alt="Logo công ty"
                        className="size-full rounded-xl border border-slate-200 bg-slate-50 object-cover"
                    />
                    <input
                        ref={logoInput}
                        type="file"
                        accept=".jpg,.png" //BE chỉ nhận .jpg và .png (không có .jpeg)
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = "" //cho phép chọn lại đúng file đó lần sau
                            if (file) logo.onPick(file)
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => logoInput.current?.click()}
                        disabled={logo.busy}
                        aria-label="Đổi logo công ty"
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/50 px-1 text-center text-[11px] font-medium leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-slate-900/0"
                    >
                        {logo.busy ? "Đang tải lên…" : "Đổi logo"}
                    </button>
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">Logo công ty</p>
                    <p className="mt-0.5 text-xs text-slate-500">JPG hoặc PNG, tối đa 2MB.</p>
                    {logo.error && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                            {logo.error}
                        </p>
                    )}
                </div>
            </div>

            <FormField
                label="Tên công ty *"
                name="companyName"
                value={draft.companyName}
                onChange={onChange}
                error={errors.companyName}
                readOnly={verified}
                hint={lockedHint}
                placeholder="Tên công ty của bạn"
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                    label="Địa chỉ *"
                    name="address"
                    value={draft.address}
                    onChange={onChange}
                    error={errors.address}
                    placeholder="Tỉnh/thành phố, quốc gia"
                />
                <FormField
                    label="Số điện thoại *"
                    name="phone"
                    value={draft.phone}
                    onChange={onChange}
                    error={errors.phone}
                    type="tel"
                    placeholder="Số điện thoại"
                />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                    label="Năm thành lập *"
                    name="foundedYear"
                    value={draft.foundedYear}
                    onChange={onChange}
                    error={errors.foundedYear}
                    type="number"
                    placeholder="Ví dụ: 2018"
                />
                <FormField
                    label="Mã số thuế *"
                    name="taxCode"
                    value={draft.taxCode}
                    onChange={onChange}
                    error={errors.taxCode}
                    readOnly={verified}
                    hint={lockedHint}
                    placeholder="Mã số thuế doanh nghiệp"
                />
            </div>

            <FormField
                label="Website"
                name="website"
                value={draft.website}
                onChange={onChange}
                error={errors.website}
                placeholder="congtycuaban.com"
            />

            <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">{profile?.email || "Lấy từ tài khoản của bạn"}</p>
                <p className="mt-1 text-xs text-slate-400">Email lấy từ tài khoản của bạn và không thể thay đổi tại đây.</p>
            </div>

            <FormField
                label="Lĩnh vực hoạt động *"
                name="field"
                value={draft.field}
                onChange={onChange}
                error={errors.field}
                type="textarea"
                rows={2}
                hint="Nhiều lĩnh vực thì cách nhau bằng dấu phẩy, ví dụ: Công nghệ, Phát triển phần mềm."
                placeholder="Công nghệ, Phát triển phần mềm"
            />

            <FormField
                label="Mô tả"
                name="description"
                value={draft.description}
                onChange={onChange}
                error={errors.description}
                type="textarea"
                rows={5}
                hint="Câu đầu tiên sẽ hiển thị làm khẩu hiệu của công ty."
                placeholder="Giới thiệu để ứng viên hiểu công ty bạn hoạt động trong lĩnh vực gì."
            />
        </div>
    )
}

export default CompanyProfileForm
