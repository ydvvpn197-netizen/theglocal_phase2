'use client'

import { useState, useLayoutEffect } from 'react'

/**
 * Hook to get the CSP nonce from the meta tag
 * This allows client components to access the nonce for inline styles
 * @returns The nonce string or undefined if not found
 */
export function useNonce(): string | undefined {
  const [nonce, setNonce] = useState<string | undefined>(() => {
    // Read nonce synchronously on mount if available (for SSR hydration)
    if (typeof document !== 'undefined') {
      const metaElement = document.querySelector('meta[name="csp-nonce"]')
      return metaElement?.getAttribute('content') || undefined
    }
    return undefined
  })

  useLayoutEffect(() => {
    // Double-check after layout (in case meta tag was added after initial render)
    if (!nonce && typeof document !== 'undefined') {
      const metaElement = document.querySelector('meta[name="csp-nonce"]')
      const nonceValue = metaElement?.getAttribute('content') || undefined
      if (nonceValue) {
        setNonce(nonceValue)
      }
    }
  }, [nonce])

  return nonce
}
