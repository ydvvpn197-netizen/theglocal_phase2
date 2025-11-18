/**
 * Media Error Boundary
 *
 * Specialized error boundary for media components.
 * Now uses the unified ErrorBoundary component.
 */

'use client'

import { ErrorBoundary } from '@/components/error-boundary'
import { AlertTriangle } from 'lucide-react'

interface MediaErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function MediaErrorBoundary({ children, fallback }: MediaErrorBoundaryProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
      <div className="text-center text-gray-500">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Failed to load media content</p>
      </div>
    </div>
  )

  return (
    <ErrorBoundary featureName="Media" fallback={fallback || defaultFallback}>
      {children}
    </ErrorBoundary>
  )
}
