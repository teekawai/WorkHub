import { useInView } from '../../hooks/useInView'

// ─── Icon SVGs ─────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
)

const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
)

// ─── Benefits list ────────────────────────────────────────────────────────────
const BENEFITS = [
  'Miễn phí đăng tin',
  'Duyệt CV nhanh',
  'Quản lý hồ sơ ứng viên',
]

// ─────────────────────────────────────────────────────────────────────────────

function EmployerCTA() {
  const [ref, inView] = useInView()

  return (
    <section className="relative overflow-hidden bg-[#0f1f3d] py-20 px-5">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-700/20" />
      <div className="pointer-events-none absolute -bottom-16 -right-4 w-48 h-48 rounded-full bg-blue-600/15" />

      <div
        ref={ref}
        className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-10"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Left — content */}
        <div className="flex-1">
          {/* Eyebrow badge */}
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Dành cho nhà tuyển dụng
          </span>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Tìm ứng viên phù hợp{' '}
            <span className="text-blue-400">nhanh hơn bao giờ hết</span>
          </h2>

          {/* Subtitle */}
          <p className="text-white/60 text-sm leading-relaxed mb-7 max-w-md">
            Đăng tin tuyển dụng miễn phí và tiếp cận hàng nghìn ứng viên tiềm năng ngay hôm nay.
          </p>

          {/* Checkmarks */}
          <ul className="flex flex-wrap gap-x-6 gap-y-2.5">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <CheckIcon />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — buttons */}
        <div className="flex flex-col gap-3 md:min-w-[220px]">
          <button className="flex items-center justify-between gap-2 bg-white hover:bg-gray-100 active:scale-[0.97] text-gray-900 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200">
            Đăng ký nhà tuyển dụng
            <ArrowIcon />
          </button>
          <button className="flex items-center justify-between gap-2 bg-transparent hover:bg-white/10 border border-white/30 hover:border-white/50 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200">
            Tìm hiểu thêm
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  )
}

export default EmployerCTA
