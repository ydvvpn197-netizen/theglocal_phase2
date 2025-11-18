'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface Sentry {
  captureException: (
    error: Error,
    context?: {
      contexts?: { react?: ErrorInfo }
      extra?: Record<string, unknown>
    }
  ) => void
}

interface WindowWithSentry extends Window {
  Sentry?: Sentry
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  featureName?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details in a structured format for better debugging
    const featureName = this.props.featureName || 'Application'
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      featureName,
    }

    // Log using logger
    log.error(`[${featureName}] Error caught by error boundary:`, error, {
      componentStack: errorInfo.componentStack,
      featureName,
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Send to Sentry in production
    if (typeof window !== 'undefined') {
      const windowWithSentry = window as WindowWithSentry
      if (windowWithSentry.Sentry) {
        windowWithSentry.Sentry.captureException(error, {
          contexts: { react: errorInfo },
          extra: errorDetails,
        })
      }
    }

    // In development only, log additional details
    if (process.env.NODE_ENV === 'development') {
      log.error('ErrorBoundary caught an error:', error, {
        errorDetails,
        componentStack: errorInfo.componentStack,
        errorStack: error.stack,
      })
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                {this.props.featureName
                  ? `The ${this.props.featureName} feature encountered an error`
                  : 'We apologize for the inconvenience. An unexpected error occurred.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-2">
                  <p className="text-sm font-medium text-red-800 mb-1">Development Error:</p>
                  <p className="text-xs text-red-600 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-800 cursor-pointer font-medium">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-red-600 font-mono mt-1 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

// Specific error boundaries for different parts of the app
export function MediaErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load media content</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function PostErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="p-4 border-red-200">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Unable to load this post</span>
          </div>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function NavigationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
            <p className="text-sm">Navigation error occurred</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
