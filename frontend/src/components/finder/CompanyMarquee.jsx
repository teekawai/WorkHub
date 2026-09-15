import { COMPANIES } from '../../constants/homeData'

// ─── Màu nền xoay vòng cho initials avatar ───────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-600',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
]

// ─── Card đơn ─────────────────────────────────────────────────────────────────
function CompanyCard({ company, colorClass }) {
  return (
    <div className="
      group shrink-0 w-52 flex items-center gap-3.5 px-4 py-3.5
      bg-white border border-gray-100 rounded-2xl cursor-pointer
      hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50
      hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
    ">
      {/* Initials avatar */}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tracking-wide ${colorClass}`}>
        {company.initials}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 truncate transition-colors duration-200">
          {company.name}
        </p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{company.field}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function CompanyMarquee() {
  // Nhân đôi list để tạo vòng lặp liền mạch
  const doubled = [...COMPANIES, ...COMPANIES]

  return (
    <section className="bg-gray-50 py-16 overflow-hidden">

      {/* Section header */}
      <div className="text-center mb-10 px-5">
        <span className="inline-block text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full mb-3">
          Đối tác tuyển dụng
        </span>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Doanh nghiệp hàng đầu tin dùng
        </h2>
        <p className="text-gray-500 mt-1.5 text-sm">
          Hàng trăm công ty đang tìm kiếm ứng viên phù hợp trên WorkHub
        </p>
      </div>

      {/* Marquee track */}
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-gray-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-gray-50 to-transparent" />

        <div className="flex gap-4 animate-marquee w-max px-4">
          {doubled.map((company, i) => (
            <CompanyCard
              key={i}
              company={company}
              colorClass={AVATAR_COLORS[company.id % AVATAR_COLORS.length]}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default CompanyMarquee
