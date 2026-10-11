import { useInView } from '../../hooks/useInView'
import { useNavigate } from 'react-router-dom'

function EmployerFinalCTA() {
  const [ref, inView] = useInView()
  const navigate = useNavigate()

  return (
    <section className="bg-[#0f1f3d] py-24 px-5 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-700/20" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-blue-600/15" />

      <div
        ref={ref}
        className="relative z-10 max-w-2xl mx-auto text-center"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
          Sẵn sàng tìm{' '}
          <span className="text-blue-400">ứng viên phù hợp?</span>
        </h2>
        <p className="text-white/55 text-base mb-10 max-w-md mx-auto leading-relaxed">
          Đăng tin tuyển dụng ngay hôm nay — miễn phí, nhanh chóng, tiếp cận hàng nghìn ứng viên tiềm năng.
        </p>
        <button
          onClick={() => navigate('#')}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm px-8 py-4 rounded-xl shadow-lg shadow-black/25 transition-all duration-200 hover:scale-105 active:scale-[0.97]"
        >
          Đăng tin tuyển dụng ngay
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </section>
  )
}

export default EmployerFinalCTA
