import { useState, useEffect } from 'react'
import { QUICK_TAGS } from '../../constants/homeData'
import heroImg from '../../assets/finder_hero.png'

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path strokeLinecap="round" d="m21 21-4.35-4.35" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4.5-7-7.8-7-10.5a7 7 0 0 1 14 0C19 13.2 16 16.5 12 21Z" />
    <circle cx="12" cy="10.5" r="2.5" />
  </svg>
)

const ArrowIcon = () => (
  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
)

// ─── Fade-up helper (stagger via delay ms) ────────────────────────────────────
const fadeUpStyle = (visible, delay = 0) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(28px)',
  transition: `opacity 0.75s cubic-bezier(0.32,0.72,0,1) ${delay}ms,
               transform 0.75s cubic-bezier(0.32,0.72,0,1) ${delay}ms`,
})

// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  const [keyword, setKeyword]   = useState('')
  const [location, setLocation] = useState('')
  const [visible, setVisible]   = useState(false)

  // Trigger enter animation — delay nhỏ hơn một chút so với NavBar
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <section
      className="relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${heroImg})` }}
    >
      {/* ── Dark overlay để chữ dễ đọc trên ảnh ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/70 via-blue-900/60 to-blue-800/50" />

      {/* ── pt-16: đẩy nội dung xuống tránh bị navbar (absolute) che ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-36 pb-24 text-center">

        {/* Eyebrow badge */}
        <div style={fadeUpStyle(visible, 0)} className="mb-5">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white/90 text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Nền tảng tuyển dụng tin cậy
          </span>
        </div>

        {/* Headline */}
        <h1
          style={fadeUpStyle(visible, 120)}
          className="text-4xl md:text-[3.25rem] font-extrabold text-white leading-[1.15] tracking-tight mb-5"
        >
          Tìm việc làm<br />
          <span className="text-blue-200">phù hợp với bạn</span>
        </h1>

        {/* Subtitle */}
        <p
          style={fadeUpStyle(visible, 220)}
          className="text-white/70 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto"
        >
          Hàng trăm cơ hội việc làm từ các doanh nghiệp hàng đầu đang chờ bạn khám phá.
        </p>

        {/* ── Search bar ── */}
        <div
          style={fadeUpStyle(visible, 320)}
          className="bg-white rounded-2xl p-2 flex flex-col md:flex-row items-stretch gap-2 shadow-2xl shadow-blue-950/40 max-w-2xl mx-auto mb-8"
        >
          {/* Keyword */}
          <label className="flex items-center gap-2.5 flex-1 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors duration-200 cursor-text">
            <span className="text-gray-400"><SearchIcon /></span>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Vị trí, kỹ năng, công ty..."
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
          </label>

          {/* Divider */}
          <div className="hidden md:block w-px bg-gray-150 my-1.5 self-stretch" />

          {/* Location */}
          <label className="flex items-center gap-2.5 md:w-44 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors duration-200 cursor-text">
            <span className="text-gray-400"><LocationIcon /></span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Địa điểm"
              className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
          </label>

          {/* CTA button */}
          <button className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white font-semibold text-sm px-6 py-3 rounded-xl shrink-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
            Tìm kiếm
            <ArrowIcon />
          </button>
        </div>

        {/* Quick tags */}
        <div style={fadeUpStyle(visible, 420)} className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-white/45 text-xs font-medium">Phổ biến:</span>
          {QUICK_TAGS.map(tag => (
            <button
              key={tag}
              className="text-xs text-white/75 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 px-3 py-1 rounded-full transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              {tag}
            </button>
          ))}
        </div>

      </div>
    </section>
  )
}

export default HeroSection
