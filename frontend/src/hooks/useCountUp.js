import { useEffect, useState } from 'react'

/**
 * Animates a number from 0 → target over `duration` ms.
 * Only starts when `inView` flips to true (wired to useInView).
 *
 * @param {number} target    - The number to count up to
 * @param {number} duration  - Animation duration in ms (default 1800)
 * @param {boolean} inView   - Triggers the animation when true
 */
export function useCountUp(target, duration = 1800, inView = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView || target === 0) return

    let startTime = null

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // ease-out cubic for a natural deceleration feel
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }

    const frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [inView, target, duration])

  return count
}
