/**
 * Media Feature Error Boundary
 *
 * Specialized error boundary for media components (images, videos).
 * Handles media loading errors and provides appropriate fallbacks.
 */

'use client'

import { ReactNode } from 'react'
import { FeatureErrorBoundary } from './feature-error-boundary'
import { ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { WindowWithGtag } from '@/lib/types/window-extensions'

interface Props {
  children: ReactNode
  onError?: (error: Error) => void
  mediaType?: 'image' | 'video' | 'general'
}

export function MediaErrorBoundary({ children, onError, mediaType = 'general' }: Props) {
  const handleError = (error: Error, _errorInfo: React.ErrorInfo) => {
    // Send to analytics
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as WindowWithGtag
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: `Media Error: ${error.message}`,
          fatal: false,
          feature: 'media',
          media_type: mediaType,
        })
      }
    }

    // Call custom handler
    if (onError) {
      onError(error)
    }
  }

  const getMessageByType = () => {
    switch (mediaType) {
      case 'image':
        return {
          title: 'Unable to load image',
          description:
            'The image could not be displayed. It may have been removed or there might be a connection issue.',
        }
      case 'video':
        return {
          title: 'Unable to load video',
          description:
            'The video could not be played. It may have been removed or there might be a connection issue.',
        }
      default:
        return {
          title: 'Unable to load media',
          description:
            'The media content could not be displayed. It may have been removed or there might be a connection issue.',
        }
    }
  }

  const message = getMessageByType()

  const fallback = (
    <Card className="p-6 text-center bg-muted/30">
      <ImageOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{message.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message.description}</p>
      <Button onClick={() => window.location.reload()} variant="outline" size="sm">
        Retry
      </Button>
    </Card>
  )

  return (
    <FeatureErrorBoundary
      featureName={`Media (${mediaType})`}
      fallback={fallback}
      onError={handleError}
    >
      {children}
    </FeatureErrorBoundary>
  )
}
