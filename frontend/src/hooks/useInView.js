import { useEffect, useRef, useState } from 'react'

/**
 * Fires once when the referenced element enters the viewport.
 * Returns [ref, inView] — attach ref to the element you want to observe.
 *
 * @param {IntersectionObserverInit} options
 */
export function useInView(options = {}) {
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
      { threshold: 0.12, ...options }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
