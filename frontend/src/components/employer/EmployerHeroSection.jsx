import { useState, useEffect } from 'react'

// ─── Icons ────────────────────────────────────────────────────────────────────
const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
)

// ─── Fade-up helper ───────────────────────────────────────────────────────────
const fadeUp = (visible, delay = 0) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(28px)',
  transition: `opacity 0.75s cubic-bezier(0.32,0.72,0,1) ${delay}ms,
               transform 0.75s cubic-bezier(0.32,0.72,0,1) ${delay}ms`,
})

const BENEFITS = [
  'Đăng tin miễn phí',
  'Duyệt CV nhanh chóng',
  'Quản lý ứng viên dễ dàng',
]

// ─────────────────────────────────────────────────────────────────────────────

function EmployerHeroSection() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#0f1f3d] pt-36 pb-28 px-5">
      {/* ── Decorative circles ── */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-blue-700/20" />
      <div className="pointer-events-none absolute top-1/2 -right-10 w-64 h-64 rounded-full bg-blue-600/10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-800/20" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Eyebrow badge */}
        <div style={fadeUp(visible, 0)} className="mb-6">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Dành cho nhà tuyển dụng
          </span>
        </div>

        {/* Headline */}
        <h1
          style={fadeUp(visible, 120)}
          className="text-4xl md:text-[3.25rem] font-extrabold text-white leading-[1.15] tracking-tight mb-5"
        >
          Tuyển dụng thông minh,<br />
          <span className="text-blue-400">nhanh hơn bao giờ hết</span>
        </h1>

        {/* Subtitle */}
        <p
          style={fadeUp(visible, 220)}
          className="text-white/60 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto"
        >
          Tiếp cận hàng nghìn ứng viên tiềm năng, quản lý toàn bộ quy trình tuyển dụng — miễn phí, nhanh chóng, hiệu quả.
        </p>

        {/* CTA buttons */}
        <div style={fadeUp(visible, 320)} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 active:scale-[0.97]">
            Đăng tin tuyển dụng
            <ArrowIcon />
          </button>
          <button className="flex items-center gap-2 bg-transparent hover:bg-white/10 border border-white/30 hover:border-white/50 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-[0.97]">
            Tìm hiểu thêm
            <ArrowIcon />
          </button>
        </div>

        {/* Benefits inline */}
        <ul style={fadeUp(visible, 420)} className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <CheckIcon />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default EmployerHeroSection
