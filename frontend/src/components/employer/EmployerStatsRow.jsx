import { useInView } from '../../hooks/useInView'
import { useCountUp } from '../../hooks/useCountUp'
import { EMPLOYER_STATS } from '../../constants/employerData'

// ─── Single stat item ─────────────────────────────────────────────────────────
function StatItem({ stat, inView }) {
  const count = useCountUp(stat.value, 1800, inView)

  return (
    <div className="flex flex-col items-center text-center px-8">
      <span className="text-5xl font-extrabold text-white tracking-tight tabular-nums">
        {count}
        <span className="text-blue-400">{stat.suffix}</span>
      </span>
      <span className="mt-2 text-base font-semibold text-white/90">{stat.label}</span>
      <span className="mt-0.5 text-sm text-white/45">{stat.sub}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EmployerStatsRow() {
  const [ref, inView] = useInView()

  return (
    <section className="bg-[#0c1a33] border-y border-white/10 py-16 px-5">
      <div
        ref={ref}
        className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x sm:divide-white/10"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {EMPLOYER_STATS.map(stat => (
          <StatItem key={stat.id} stat={stat} inView={inView} />
        ))}
      </div>
    </section>
  )
}

export default EmployerStatsRow
