/**
 * Runtime Accessibility Checker
 *
 * Uses @axe-core/react to check for accessibility violations
 * in development mode. Violations are logged to the console.
 *
 * This is disabled in production for performance.
 */

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * Initialize axe-core React runtime checker
 * Call this once in your root layout or _app.tsx
 *
 * @param enabled - Whether to enable the checker (default: process.env.NODE_ENV === 'development')
 */
export function useAxeReact(enabled?: boolean) {
  useEffect(() => {
    // Only run in development by default
    const shouldRun = enabled ?? process.env.NODE_ENV === 'development'

    if (!shouldRun || typeof window === 'undefined') {
      return
    }

    // Dynamically import @axe-core/react to avoid loading in production
    Promise.all([import('@axe-core/react'), import('react'), import('react-dom')])
      .then(([axe, react, reactDOM]) => {
        // Initialize axe with React and ReactDOM
        axe.default(react, reactDOM, 1000, {
          // Configuration options
          rules: [
            // Enable all rules by default
            // You can disable specific rules here if needed
            // { id: 'color-contrast', enabled: false },
          ],
        })

        logger.info('[A11y] axe-core runtime checker initialized')
      })
      .catch((error) => {
        logger.warn('[A11y] Failed to initialize axe-core', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }, [enabled])
}

/**
 * HOC to wrap a component with accessibility checking
 * Useful for checking specific components in isolation
 *
 * @param Component - React component to wrap
 * @param options - axe-core configuration options
 */
export function withAccessibilityCheck<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enabled?: boolean
    rules?: Array<{ id: string; enabled: boolean }>
  }
): React.ComponentType<P> {
  return function AccessibilityCheckedComponent(props: P) {
    useAxeReact(options?.enabled)
    return <Component {...props} />
  }
}

/**
 * Custom hook to check accessibility of a specific element
 *
 * @param ref - React ref to the element to check
 * @param options - axe-core configuration options
 */
export function useAccessibilityCheck(
  ref: React.RefObject<HTMLElement>,
  options?: {
    enabled?: boolean
    rules?: Array<{ id: string; enabled: boolean }>
  }
) {
  useEffect(() => {
    const shouldRun = options?.enabled ?? process.env.NODE_ENV === 'development'

    if (!shouldRun || !ref.current || typeof window === 'undefined') {
      return
    }

    // Dynamically import axe-core for checking
    import('axe-core')
      .then(({ default: axe }) => {
        const rulesConfig: Record<string, { enabled: boolean }> = {}
        if (options?.rules) {
          options.rules.forEach((rule) => {
            rulesConfig[rule.id] = { enabled: rule.enabled }
          })
        }

        return axe.run(ref.current!, {
          rules: rulesConfig,
        })
      })
      .then((results) => {
        if (results.violations.length > 0) {
          logger.warn(`[A11y] ${results.violations.length} violation(s) found`, {
            violationCount: results.violations.length,
          })
          results.violations.forEach((violation) => {
            logger.error(`[${violation.impact}] ${violation.help}`, undefined, {
              description: violation.description,
              helpUrl: violation.helpUrl,
              nodes: violation.nodes.map((node) => ({
                html: node.html,
                target: node.target,
                failureSummary: node.failureSummary,
              })),
            })
          })
        }
      })
      .catch((error) => {
        logger.warn('[A11y] Failed to check accessibility', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }, [ref, options])
}

/**
 * Accessibility testing utilities for development
 */
export const a11yUtils = {
  /**
   * Check if an element has sufficient color contrast
   */
  hasGoodContrast: (foreground: string, background: string): boolean => {
    // This is a simplified check
    // For production, use a proper color contrast library
    const fgLuminance = getLuminance(foreground)
    const bgLuminance = getLuminance(background)

    const ratio =
      fgLuminance > bgLuminance
        ? (fgLuminance + 0.05) / (bgLuminance + 0.05)
        : (bgLuminance + 0.05) / (fgLuminance + 0.05)

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    return ratio >= 4.5
  },

  /**
   * Check if an element has an accessible name
   */
  hasAccessibleName: (element: HTMLElement): boolean => {
    // Check for aria-label, aria-labelledby, or text content
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim()
    )
  },

  /**
   * Check if a button/link has sufficient size (44x44px minimum)
   */
  hasSufficientSize: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  },
}

/**
 * Helper function to calculate relative luminance
 * Based on WCAG 2.1 definition
 */
function getLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Apply gamma correction
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  // Calculate relative luminance
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
}
