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
//  logo: { canChange, busy, error, onPick(file) } — canChange=false khi profile chưa tồn tại (BE 404); error = lỗi upload gần nhất (chuỗi rỗng nếu không có)
function CompanyProfileForm({ profile, draft, errors, onChange, logo }) {
    const logoInput = useRef(null)

    return (
        <div className="flex flex-col gap-6">
            {/* Logo: bấm vào ảnh khi đang edit để đổi, giống avatar bên Finder */}
            <div className="flex items-center gap-4">
                <div className="group relative size-20 shrink-0">
                    <img
                        src={profile?.logo || defaultLogo}
                        alt="Company logo"
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
                        disabled={!logo.canChange || logo.busy}
                        aria-label="Change company logo"
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/50 px-1 text-center text-[11px] font-medium leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-slate-900/0"
                    >
                        {logo.busy ? "Uploading…" : logo.canChange ? "Change logo" : ""}
                    </button>
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">Company logo</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {logo.canChange ? "JPG or PNG, up to 2MB." : "Save your profile first to add a logo."}
                    </p>
                    {logo.error && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                            {logo.error}
                        </p>
                    )}
                </div>
            </div>

            <FormField
                label="Company name *"
                name="companyName"
                value={draft.companyName}
                onChange={onChange}
                error={errors.companyName}
                placeholder="Your company's name"
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                    label="Address *"
                    name="address"
                    value={draft.address}
                    onChange={onChange}
                    error={errors.address}
                    placeholder="City, country"
                />
                <FormField
                    label="Phone *"
                    name="phone"
                    value={draft.phone}
                    onChange={onChange}
                    error={errors.phone}
                    type="tel"
                    placeholder="Phone number"
                />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                    label="Founded year *"
                    name="foundedYear"
                    value={draft.foundedYear}
                    onChange={onChange}
                    error={errors.foundedYear}
                    type="number"
                    placeholder="e.g. 2018"
                />
                <FormField
                    label="Tax code *"
                    name="taxCode"
                    value={draft.taxCode}
                    onChange={onChange}
                    error={errors.taxCode}
                    placeholder="Business tax code"
                />
            </div>

            <FormField
                label="Website"
                name="website"
                value={draft.website}
                onChange={onChange}
                error={errors.website}
                placeholder="yourcompany.com"
            />

            <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">{profile?.email || "Taken from your account"}</p>
                <p className="mt-1 text-xs text-slate-400">Email comes from your account and can't be changed here.</p>
            </div>

            <FormField
                label="Field *"
                name="field"
                value={draft.field}
                onChange={onChange}
                error={errors.field}
                type="textarea"
                rows={2}
                hint="Separate multiple fields with commas, e.g. Technology, Software Development."
                placeholder="Technology, Software Development"
            />

            <FormField
                label="Description"
                name="description"
                value={draft.description}
                onChange={onChange}
                error={errors.description}
                type="textarea"
                rows={5}
                hint="The first sentence is shown as your company's tagline."
                placeholder="Tell candidates what your company does."
            />
        </div>
    )
}

export default CompanyProfileForm
