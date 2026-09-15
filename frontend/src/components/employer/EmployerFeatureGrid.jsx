import { useInView } from '../../hooks/useInView'
import { EMPLOYER_FEATURES } from '../../constants/employerData'

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS = {
  post: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  cv: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  filter: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591L15.25 12.75v6a.75.75 0 0 1-1.079.67l-3-1.5a.75.75 0 0 1-.421-.67v-4.5l-5.091-5.431A2.25 2.25 0 0 1 5 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  ),
  status: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  manage: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  ),
  profile: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ feature, inView, delay }) {
  return (
    <div
      className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.03] cursor-default"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, background 0.3s, border 0.3s, scale 0.2s`,
      }}
    >
      {/* Icon bubble */}
      <div className="w-12 h-12 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors duration-300">
        {ICONS[feature.icon]}
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-1.5">{feature.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EmployerFeatureGrid() {
  const [ref, inView] = useInView()

  return (
    <section className="bg-[#0f1f3d] py-20 px-5">
      {/* Section header */}
      <div
        className="text-center mb-12"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
          Mọi thứ bạn cần để <span className="text-blue-400">tuyển đúng người</span>
        </h2>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Bộ công cụ đơn giản nhưng đủ mạnh — từ đăng tin đến quản lý ứng viên trong một nơi.
        </p>
      </div>

      {/* 3×2 grid */}
      <div
        ref={ref}
        className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {EMPLOYER_FEATURES.map((feature, i) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            inView={inView}
            delay={i * 80}
          />
        ))}
      </div>
    </section>
  )
}

export default EmployerFeatureGrid
