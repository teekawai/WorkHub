import { useInView } from '../../hooks/useInView'
import { HOW_IT_WORKS } from '../../constants/employerData'

// ─────────────────────────────────────────────────────────────────────────────

function StepCard({ step, inView, delay, isLast }) {
  return (
    <div className="flex flex-col items-center text-center relative">
      {/* Connector line — chạy ngang giữa các bước, ẩn ở bước cuối */}
      {!isLast && (
        <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-white/10" />
      )}

      {/* Step bubble */}
      <div
        className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-5 transition-all duration-300 hover:scale-110 hover:bg-blue-500/30 cursor-default"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
          transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        }}
      >
        <span className="text-blue-400 font-extrabold text-lg tracking-tight">{step.step}</span>
      </div>

      {/* Content */}
      <div
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(12px)',
          transition: `opacity 0.6s ease ${delay + 100}ms, transform 0.6s ease ${delay + 100}ms`,
        }}
      >
        <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EmployerHowItWorks() {
  const [ref, inView] = useInView()

  return (
    <section className="bg-[#0c1a33] py-20 px-5">
      {/* Header */}
      <div
        className="text-center mb-14"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
          Bắt đầu chỉ trong <span className="text-blue-400">4 bước</span>
        </h2>
        <p className="text-white/50 text-sm max-w-sm mx-auto">
          Quy trình đơn giản, trực quan — từ đăng ký đến tuyển được người phù hợp.
        </p>
      </div>

      {/* Steps */}
      <div
        ref={ref}
        className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6"
      >
        {HOW_IT_WORKS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            inView={inView}
            delay={i * 100}
            isLast={i === HOW_IT_WORKS.length - 1}
          />
        ))}
      </div>
    </section>
  )
}

export default EmployerHowItWorks
