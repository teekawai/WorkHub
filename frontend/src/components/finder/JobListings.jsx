import { useState } from 'react'
import { useInView } from '../../hooks/useInView'

// ─── Tab filter labels ────────────────────────────────────────────────────────
const TABS = ['Tất cả', 'IT', 'Marketing', 'Thiết kế', 'Tài chính']

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Company row */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gray-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-2/3" />
          <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/3" />
        </div>
      </div>

      {/* Job title */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-5/6" />
        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
      </div>

      {/* Tags */}
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-24" />
        <div className="h-8 bg-blue-50 rounded-xl animate-pulse w-24" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function JobListings() {
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [ref, inView] = useInView()

  return (
    <section className="bg-white py-20 px-5">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-block text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full mb-3">
              Cơ hội mới nhất
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Việc làm mới nhất
            </h2>
          </div>

          {/* Tab filter */}
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200
                  ${activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton grid — sẽ thay bằng real data khi có API */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 60} />
          ))}
        </div>

        {/* Placeholder CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400 mb-4">Dữ liệu việc làm sẽ hiển thị sau khi API sẵn sàng</p>
          <button className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-200">
            Xem tất cả việc làm
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  )
}

export default JobListings
