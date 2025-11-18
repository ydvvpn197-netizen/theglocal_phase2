'use client'

import { useCallback, useEffect, useRef, useState, RefObject } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
  freezeOnceVisible?: boolean
}

interface IntersectionObserverEntry {
  isIntersecting: boolean
  intersectionRatio: number
  boundingClientRect: DOMRectReadOnly
  rootBounds: DOMRectReadOnly | null
  target: Element
  time: number
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  elementRef: RefObject<T>,
  options: UseIntersectionObserverOptions = {}
): IntersectionObserverEntry | null {
  const { threshold = 0, root = null, rootMargin = '0%', freezeOnceVisible = false } = options
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const frozen = useRef(false)

  const updateEntry = useCallback(
    ([entry]: IntersectionObserverEntry[]): void => {
      if (!entry) return
      setEntry(entry)

      if (freezeOnceVisible && entry.isIntersecting) {
        frozen.current = true
      }
    },
    [freezeOnceVisible]
  )

  useEffect(() => {
    const element = elementRef.current
    const hasIOSupport = typeof window !== 'undefined' && 'IntersectionObserver' in window

    if (!hasIOSupport || frozen.current || !element) return

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(element)

    return () => {
      if (element) {
        observer.disconnect()
      }
    }
  }, [elementRef, threshold, root, rootMargin, updateEntry])

  return entry
}
