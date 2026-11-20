import { useEffect, useRef, useState } from 'react'

/**
 * Fires once when the referenced element enters the viewport.
 * Returns [ref, inView] — attach ref to the element you want to observe.
 *
 * @param {IntersectionObserverInit} options (threshold mặc định 0.12)
 */
export function useInView({ threshold = 0.12, root = null, rootMargin } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el) // fire once only
        }
      },
      { threshold, root, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, root, rootMargin]) //tách primitive thay vì object options để không chạy lại effect mỗi lần render

  return [ref, inView]
}
