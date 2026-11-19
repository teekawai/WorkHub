import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useInView } from '../../hooks/useInView'
import useJobOptions from '../../hooks/useJobOptions'
import { searchJobs, getJobErrorMsg } from '../../api/job'
import { buildSearchUrl, parseSearchQuery, toApiParams } from '../../utils/jobSearch'
import { findBackCategory } from '../../utils/homeJobs'
import OptionsRetry from './OptionsRetry'
import JobCard from './job/JobCard'
import JobCardSkeleton from './job/JobCardSkeleton'

// ─── Tab filter labels (nhãn ngắn, map sang ngành BE qua /jobs/options) ──────
const TABS = ['Tất cả', 'IT', 'Marketing', 'Thiết kế', 'Tài chính']
const LIMIT = 6
const EMPTY_FILTERS = parseSearchQuery(new URLSearchParams())
// 3 hàng thẻ (3x168 + 2x16 = 536px) ở 2 cột: giữ chiều cao khi rỗng/lỗi để không nhảy bố cục
const MIN_H = 'min-h-[200px] md:min-h-[536px]'

function JobListings() {
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [ref, inView] = useInView()
  const { options, loading: optionsLoading, errorMsg: optionsError, reload } = useJobOptions()
  const [result, setResult] = useState(null) // { key, items, errorMsg }
  const [reloadKey, setReloadKey] = useState(0)

  const category = activeTab === 'Tất cả' ? '' : findBackCategory(activeTab, options) ?? ''
  // Tab ngành phải chờ /jobs/options, tránh bắn 1 request không lọc rồi lại bắn lại
  const ready = activeTab === 'Tất cả' || !optionsLoading
  const key = `${category}|${reloadKey}`

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    searchJobs(toApiParams({ ...EMPTY_FILTERS, category }, { limit: LIMIT }), controller.signal)
      .then((data) => setResult({ key, items: data.items, errorMsg: '' }))
      .catch((err) => {
        if (axios.isCancel(err)) return // đổi tab: bỏ request cũ
        setResult({ key, items: [], errorMsg: getJobErrorMsg(err) })
      })
    return () => controller.abort()
  }, [ready, category, key])

  // Chờ hoặc lỗi options: khóa tab ngành để không bấm ra "mọi tin" mà tưởng đã lọc
  const tabsLocked = optionsLoading || !!optionsError

  const loading = !ready || result?.key !== key
  const items = loading ? [] : result.items
  const errorMsg = loading ? '' : result.errorMsg

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
                type="button"
                disabled={tab !== 'Tất cả' && tabsLocked}
                aria-disabled={tab !== 'Tất cả' && tabsLocked}
                onClick={() => setActiveTab(tab)}
                className={`
                  text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200
                  ${activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-500
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {optionsError && <div className="-mt-4 mb-4 sm:text-right"><OptionsRetry onRetry={reload} /></div>}

        {/* Lưới 2 cột, dùng đúng JobCard của trang Tìm việc */}
        <div
          ref={ref}
          className={MIN_H}
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {errorMsg ? (
            <div role="alert" className={`${MIN_H} flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-6 text-center`}>
              <p className="text-sm text-red-700">{errorMsg}</p>
              <button type="button" onClick={() => setReloadKey(k => k + 1)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Thử lại
              </button>
            </div>
          ) : !loading && items.length === 0 ? (
            <div className={`${MIN_H} flex items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-500`}>
              Chưa có việc làm phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading
                ? Array.from({ length: LIMIT }).map((_, i) => <JobCardSkeleton key={i} />)
                : items.map(job => <JobCard key={job.jobId} job={job} />)}
            </div>
          )}
        </div>

        {/* Xem tất cả → trang Tìm việc (kèm ngành của tab nếu map được) */}
        <div className="mt-10 text-center">
          <Link
            to={buildSearchUrl({ category })}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-200"
          >
            Xem tất cả việc làm
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}

export default JobListings
