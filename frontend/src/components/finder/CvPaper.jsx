import { useRef } from "react"
import defaultAvatar from "../../assets/avt-macdinh.webp"

//Tờ CV. Nhận profile từ GET /finders/me (camelCase của property C#).
//Có 2 chế độ: xem (không truyền edit) và sửa (truyền edit = { draft, errors, onChange }).
//Component này không gọi API, mọi state nằm ở FinderProfile.
//Chữ: Inter, 400 nội dung / 500 nhãn / 600 tiêu đề. Màu: xanh chủ đạo nhạt (header blue-500, cột trái blue-50, tiêu đề mục blue-700).

//Gom text kinh nghiệm thành các khối: dòng thường, hoặc danh sách (các dòng liên tiếp bắt đầu bằng "- ")
const toBlocks = (str) => {
    const blocks = []
    for (const raw of (str ?? "").split("\n")) {
        const line = raw.trim()
        if (!line) continue
        if (line.startsWith("- ")) {
            const item = line.slice(2).trim()
            const last = blocks[blocks.length - 1]
            if (last?.type === "list") last.items.push(item)
            else blocks.push({ type: "list", items: [item] })
        } else {
            blocks.push({ type: "text", text: line })
        }
    }
    return blocks
}

//link LinkedIn do người dùng nhập: chỉ cho phép http(s), thiếu giao thức thì thêm https://
const toHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
const stripProtocol = (url) => url.replace(/^https?:\/\//i, "")

//BE có thể trả "2000-01-31" hoặc "2000-01-31T00:00:00": chỉ lấy phần ngày yyyy-MM-dd (dùng cho <input type="date">)
const toDateValue = (str) => (str ? String(str).slice(0, 10) : "")
//yyyy-MM-dd -> dd/MM/yyyy để hiển thị
const formatDate = (str) => {
    const [y, m, d] = toDateValue(str).split("-")
    return y && m && d ? `${d}/${m}/${y}` : ""
}
const todayValue = () => new Date().toISOString().slice(0, 10) //ngày sinh không được ở tương lai

const ICONS = {
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
    mail: (
        <>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 6L2 7" />
        </>
    ),
    pin: (
        <>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
            <circle cx="12" cy="10" r="3" />
        </>
    ),
    cake: (
        <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </>
    ),
    link: (
        <>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
    ),
}

function Icon({ name }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name]}
        </svg>
    )
}

function ContactRow({ icon, children }) {
    return (
        <li className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-blue-600"><Icon name={icon} /></span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
        </li>
    )
}

function Section({ title, children }) {
    return (
        <section>
            <h3 className="mb-3 border-b border-blue-200 pb-2 text-lg font-semibold text-blue-700">{title}</h3>
            {children}
        </section>
    )
}

//---- phần dành cho chế độ sửa ----

//Nhãn + ô nhập + lỗi. Bọc input trong <label> nên bấm vào nhãn là focus vào ô (không cần id)
function Field({ label, error, hint, light, children }) {
    return (
        <label className="block">
            <span className={`mb-1 block text-xs font-medium ${light ? "text-blue-50" : "text-slate-600"}`}>{label}</span>
            {children}
            {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
            {error && <span role="alert" className={`mt-1 block text-xs ${light ? "text-white" : "text-red-600"}`}>{error}</span>}
        </label>
    )
}

const baseInput = "w-full rounded-md border border-dashed px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2"
const inputCls = (error) =>
    `${baseInput} bg-white text-slate-800 placeholder:text-slate-400 ${error ? "border-red-400 focus:ring-red-200" : "border-blue-300 focus:border-blue-500 focus:ring-blue-200"}`
const headerInputCls = (error) =>
    `${baseInput} bg-white/15 text-3xl font-semibold text-white placeholder:text-blue-100 ${error ? "border-white focus:ring-white/60" : "border-white/60 focus:border-white focus:ring-white/40"}`

//avatar (tùy chọn) = { canChange, busy, error, onPick(file) }: chỉ có tác dụng khi đang sửa. canChange=false khi hồ sơ chưa tồn tại (BE trả 404); error = lỗi upload gần nhất
function CvPaper({ profile, edit, avatar, ref }) {
    const editing = !!edit
    const avatarInput = useRef(null)
    const data = editing ? edit.draft : profile
    const errors = edit?.errors ?? {}
    //props chung cho 1 ô nhập: value + onChange theo tên field
    const bind = (name) => ({
        value: edit?.draft[name] ?? "",
        onChange: (e) => edit.onChange(name, e.target.value),
    })

    const blocks = toBlocks(data.experience)
    const hasEducation = !!(data.educationLevel || data.major)
    const hasContact = !!(data.phone || profile?.email || data.birthday || data.address || data.linkedIn)
    const hasMainContent = !!data.description || !!data.skill || blocks.length > 0

    return (
        <article ref={ref} aria-label="CV" className="relative mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-slate-200">
            {/* dải header: tên. Avatar nằm đè lên mép dưới dải */}
            <header className="flex min-h-36 items-center bg-blue-500 py-6 pr-8 pl-[200px]">
                {editing ? (
                    <div className="w-full">
                        <Field label="Full name *" error={errors.fullname} light>
                            <input type="text" autoComplete="name" placeholder="Your full name" className={headerInputCls(errors.fullname)} {...bind("fullname")} />
                        </Field>
                    </div>
                ) : (
                    <h2 className="min-w-0 text-3xl font-semibold leading-tight text-white [overflow-wrap:anywhere]">
                        {data.fullname || "Your name"}
                    </h2>
                )}
            </header>
            <div className="absolute left-8 top-12 size-36">
                <img
                    src={profile?.avatar || defaultAvatar}
                    alt="Profile photo"
                    className="size-full rounded-full bg-blue-100 object-cover ring-4 ring-white"
                />
                {editing && avatar && (
                    <>
                        <input
                            ref={avatarInput}
                            type="file"
                            accept=".jpg,.png" //BE chỉ nhận .jpg và .png (không có .jpeg)
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                e.target.value = "" //cho phép chọn lại đúng file đó lần sau
                                if (file) avatar.onPick(file)
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => avatarInput.current?.click()}
                            disabled={!avatar.canChange || avatar.busy}
                            aria-label="Change profile photo"
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 px-4 text-center text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                        >
                            {avatar.busy ? "Uploading…" : avatar.canChange ? "Change photo" : "Save your profile first to add a photo"}
                        </button>
                    </>
                )}
            </div>

            <div className="flex flex-1 flex-wrap">
                {/* cột trái: thông tin ngắn */}
                <aside className="flex flex-[1_1_240px] flex-col gap-7 bg-blue-50 px-6 pb-8 pt-[72px]">
                    {editing && avatar?.error && (
                        <p role="alert" className="-mt-8 text-xs font-medium text-red-600">
                            {avatar.error}
                        </p>
                    )}
                    {editing ? (
                        <>
                            <Section title="Personal information">
                                <div className="flex flex-col gap-3">
                                    <Field label="Phone *" error={errors.phone}>
                                        <input type="tel" autoComplete="tel" placeholder="Phone number" className={inputCls(errors.phone)} {...bind("phone")} />
                                    </Field>
                                    <div>
                                        <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
                                        <p className="text-sm text-slate-700 [overflow-wrap:anywhere]">{profile?.email || "Taken from your account"}</p>
                                        <p className="mt-1 text-xs text-slate-500">Email comes from your account and can't be changed here.</p>
                                    </div>
                                    <Field label="Birthday">
                                        <input type="date" max={todayValue()} className={inputCls()} {...bind("birthday")} />
                                    </Field>
                                    <Field label="Address">
                                        <input type="text" autoComplete="street-address" placeholder="City, country" className={inputCls()} {...bind("address")} />
                                    </Field>
                                    <Field label="LinkedIn">
                                        <input type="text" placeholder="linkedin.com/in/your-name" className={inputCls()} {...bind("linkedIn")} />
                                    </Field>
                                </div>
                            </Section>

                            <Section title="Education">
                                <div className="flex flex-col gap-3">
                                    <Field label="School / university">
                                        <input type="text" placeholder="Name of your school" className={inputCls()} {...bind("educationLevel")} />
                                    </Field>
                                    <Field label="Major">
                                        <input type="text" placeholder="Your major" className={inputCls()} {...bind("major")} />
                                    </Field>
                                </div>
                            </Section>
                        </>
                    ) : (
                        <>
                            {hasContact && (
                                <Section title="Personal information">
                                    <ul className="flex flex-col gap-3 text-sm text-slate-700">
                                        {data.phone && <ContactRow icon="phone">{data.phone}</ContactRow>}
                                        {profile?.email && <ContactRow icon="mail">{profile.email}</ContactRow>}
                                        {data.birthday && <ContactRow icon="cake">{formatDate(data.birthday)}</ContactRow>}
                                        {data.address && <ContactRow icon="pin">{data.address}</ContactRow>}
                                        {data.linkedIn && (
                                            <ContactRow icon="link">
                                                <a href={toHref(data.linkedIn)} target="_blank" rel="noreferrer" className="text-blue-700 underline-offset-2 hover:underline">
                                                    {stripProtocol(data.linkedIn)}
                                                </a>
                                            </ContactRow>
                                        )}
                                    </ul>
                                </Section>
                            )}

                            {hasEducation && (
                                <Section title="Education">
                                    {data.educationLevel && <p className="text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{data.educationLevel}</p>}
                                    {data.major && <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{data.major}</p>}
                                </Section>
                            )}
                        </>
                    )}
                </aside>

                {/* cột phải: nội dung dài */}
                <div className="flex min-w-0 flex-[999_1_400px] flex-col gap-8 px-10 py-8">
                    {editing ? (
                        <>
                            <Section title="Career objective">
                                <Field label="Career objective" hint="A short summary of what you're looking for.">
                                    <textarea rows={5} placeholder="Tell employers who you are and what you want to do" className={inputCls()} {...bind("description")} />
                                </Field>
                            </Section>
                            <Section title="Skills">
                                <Field label="Your skills" hint="Type them in any format you like.">
                                    <textarea rows={4} placeholder="e.g. React, ASP.NET, teamwork" className={inputCls()} {...bind("skill")} />
                                </Field>
                            </Section>
                            <Section title="Experience & projects">
                                <Field label="Experience & projects" hint={'Start a line with "- " to make it a bullet point.'}>
                                    <textarea rows={10} placeholder={"Frontend intern, ABC Company (2025)\n- Built the job search page with React"} className={inputCls()} {...bind("experience")} />
                                </Field>
                            </Section>
                        </>
                    ) : (
                        <>
                            {data.description && (
                                <Section title="Career objective">
                                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{data.description}</p>
                                </Section>
                            )}

                            {data.skill && (
                                <Section title="Skills">
                                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{data.skill}</p>
                                </Section>
                            )}

                            {blocks.length > 0 && (
                                <Section title="Experience & projects">
                                    <div className="flex flex-col gap-3 text-sm leading-6 text-slate-700">
                                        {blocks.map((block, i) =>
                                            block.type === "list" ? (
                                                <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-blue-400">
                                                    {block.items.map((item, j) => (
                                                        <li key={j} className="[overflow-wrap:anywhere]">{item}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p key={i} className="font-medium text-slate-900 [overflow-wrap:anywhere]">{block.text}</p>
                                            )
                                        )}
                                    </div>
                                </Section>
                            )}

                            {!hasMainContent && (
                                <p className="text-sm text-slate-400">Add a career objective and your experience to complete your CV.</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </article>
    )
}

export default CvPaper
