'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useRef } from 'react'
import { createTrustedScriptURL } from '@/lib/security/trusted-types'
import type { WindowWithAdsense } from '@/lib/types/window-extensions'

interface AdSenseProps {
  /**
   * Ad unit slot ID from Google AdSense
   */
  slot?: string
  /**
   * Ad format type
   */
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  /**
   * Display style for ad container
   */
  className?: string
  /**
   * Whether ad should be displayed (for client-side control)
   */
  enabled?: boolean
}

/**
 * Google AdSense ad unit component
 *
 * @example
 * <AdSense slot="1234567890" format="auto" />
 */
export function AdSense({ slot, format = 'auto', className = '', enabled = true }: AdSenseProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !slot || typeof window === 'undefined') return

    // Check if AdSense script is already loaded
    if (!scriptLoadedRef.current) {
      const adsensePubId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID || '7650178516892907'
      const script = document.createElement('script')
      const scriptUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${adsensePubId}`
      const trustedScriptUrl = createTrustedScriptURL(scriptUrl)
      script.src =
        typeof trustedScriptUrl === 'string' ? trustedScriptUrl : trustedScriptUrl.toString()
      script.async = true
      script.crossOrigin = 'anonymous'
      script.setAttribute('data-ad-client', `ca-pub-${adsensePubId}`)

      script.onload = () => {
        scriptLoadedRef.current = true
      }

      document.head.appendChild(script)
    }

    // Push ad to AdSense after a short delay to ensure script is loaded
    const timer = setTimeout(() => {
      try {
        const windowWithAdsense = window as WindowWithAdsense
        if (!windowWithAdsense.adsbygoogle) {
          windowWithAdsense.adsbygoogle = []
        }
        if (Array.isArray(windowWithAdsense.adsbygoogle)) {
          windowWithAdsense.adsbygoogle.push({})
        }
      } catch (err) {
        logger.error('AdSense error:', err)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [enabled, slot])

  if (!enabled) return null

  const adStyle: React.CSSProperties = {
    display: 'block',
    minHeight: format === 'horizontal' ? '250px' : format === 'rectangle' ? '250px' : '100px',
    width: '100%',
  }

  return (
    <div className={`adsense-container ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={adStyle}
        data-ad-client={`ca-pub-${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUB_ID || '7650178516892907'}`}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

/**
 * AdSense placeholder for when ads are disabled or not configured
 */
export function AdSensePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 ${className}`}
    >
      <p className="text-sm text-gray-500">Advertisement</p>
    </div>
  )
}
