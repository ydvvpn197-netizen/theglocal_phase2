/**
 * Feature-Level Error Boundary
 *
 * @deprecated This component is deprecated. Use ErrorBoundary from '@/components/error-boundary' instead.
 *
 * This is a wrapper around the base ErrorBoundary for backward compatibility.
 * New code should use ErrorBoundary directly with featureName prop.
 */

'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

interface Props {
  children: ReactNode
  featureName: string
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * FeatureErrorBoundary - Wrapper for backward compatibility
 * Use ErrorBoundary from '@/components/error-boundary' instead
 */
export function FeatureErrorBoundary({ children, featureName, fallback, onError }: Props) {
  return (
    <ErrorBoundary featureName={featureName} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  )
}
