import { CATEGORIES } from '../../constants/homeData'
import { useInView } from '../../hooks/useInView'

// ─── Category SVG icons ───────────────────────────────────────────────────────
const CategoryIcon = ({ type }) => {
  const cls = 'w-6 h-6'
  const icons = {
    it: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
    marketing: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 0 0 7.028 13h9.528a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7.028a4 4 0 0 0-3.99 3.71L3 9.28V13h2.436Z" />
      </svg>
    ),
    finance: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
      </svg>
    ),
    design: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
    engineering: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.734-4.548a5.52 5.52 0 0 0-2.273-1.377m5.08 5.08a5.523 5.523 0 0 1-1.378-2.273" />
      </svg>
    ),
    education: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
    health: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
    sales: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  }
  return icons[type] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────

function CategoryGrid() {
  const [ref, inView] = useInView()

  return (
    <section className="bg-white py-20 px-5">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] uppercase tracking-[0.18em] font-semibold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full mb-3">
            Khám phá ngành nghề
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Tìm việc theo lĩnh vực
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Chọn lĩnh vực phù hợp để khám phá hàng trăm cơ hội việc làm
          </p>
        </div>

        {/* Grid */}
        <div ref={ref} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.55s cubic-bezier(0.32,0.72,0,1) ${i * 60}ms,
                             transform 0.55s cubic-bezier(0.32,0.72,0,1) ${i * 60}ms`,
              }}
              className={`
                group flex flex-col items-center gap-3 p-5 rounded-2xl
                border-2 border-gray-100
                ${cat.color} ${cat.hoverColor}
                hover:border-current hover:scale-[1.04] hover:shadow-lg
                transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                cursor-pointer text-left
              `}
            >
              {/* Icon wrapper */}
              <div className="w-12 h-12 rounded-xl bg-white/60 group-hover:bg-white/20 flex items-center justify-center transition-colors duration-300">
                <CategoryIcon type={cat.icon} />
              </div>

              <div className="w-full">
                <p className="font-semibold text-sm leading-snug">{cat.shortLabel}</p>
                <p className="text-xs mt-0.5 opacity-70">
                  {cat.count !== null ? `${cat.count} việc làm` : '— việc làm'}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </section>
  )
}

export default CategoryGrid
