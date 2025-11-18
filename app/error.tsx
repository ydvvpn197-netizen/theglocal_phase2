'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Send error to Sentry
    Sentry.captureException(error, {
      tags: {
        boundary: 'page',
      },
      extra: {
        digest: error.digest,
      },
    })

    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      log.error('Error boundary caught an error:', error, {
        stack: error.stack,
        digest: error.digest,
      })
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We apologize for the inconvenience. An unexpected error occurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Development Error:</p>
              <p className="text-xs text-red-600 font-mono mb-1">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-red-600 font-mono">Digest: {error.digest}</p>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
              Refresh Page
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
