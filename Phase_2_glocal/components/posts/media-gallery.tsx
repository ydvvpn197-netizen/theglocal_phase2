'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Play, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/media/video-player'
import { MediaErrorBoundary } from '@/components/media/media-error-boundary'
import { MediaGalleryProps, MediaItem } from '@/lib/types/api.types'
import { ClientMediaItem } from '@/lib/types/media.types'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

export function MediaGallery({
  mediaItems,
  className = '',
  showLightbox = true,
  maxItems = 10,
  compact = false,
}: MediaGalleryProps) {
  // Intentional: compact prop kept for API compatibility but not used in new layout
  void compact

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saveData, setSaveData] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Data-saver and mobile-aware limits (must run before any early returns)
  interface NavigatorWithConnection extends Navigator {
    connection?: {
      saveData?: boolean
    }
  }

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection
    setSaveData(!!nav?.connection?.saveData)
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Note: Hooks must run before any early returns

  const items = mediaItems || []
  // Filter out invalid media items and log issues
  const validMediaItems = items.filter((item, index) => {
    // Enhanced null/undefined checks
    if (!item || typeof item !== 'object') {
      logger.warn(`MediaGallery: Item ${index} is null/undefined or invalid`, { item })
      return false
    }

    // Check required URL field
    if (!item.url || typeof item.url !== 'string' || item.url.trim() === '') {
      logger.warn(`MediaGallery: Item ${index} missing or invalid URL`, { item })
      return false
    }

    // Normalize media_type field (handle both snake_case and camelCase)
    interface MediaItemWithType {
      media_type?: string
      mediaType?: string
      url: string
      [key: string]: unknown
    }
    const mediaItem = item as MediaItemWithType
    const mediaType = mediaItem.media_type || mediaItem.mediaType
    if (!mediaType || typeof mediaType !== 'string') {
      logger.warn(`MediaGallery: Item ${index} missing media_type`, { item })
      return false
    }

    // Validate media type values
    const validMediaTypes = ['image', 'video', 'gif']
    if (!validMediaTypes.includes(mediaType)) {
      logger.warn(`MediaGallery: Item ${index} invalid media_type`, { mediaType, item })
      return false
    }

    return true
  })

  // Defer early return until after hooks
  if (validMediaItems.length === 0) {
    return null
  }

  const effectiveMax = Math.min(
    maxItems,
    saveData ? 2 : isMobile ? Math.min(maxItems, 3) : maxItems
  )

  const displayItems = validMediaItems.slice(0, effectiveMax)
  const remainingCount = validMediaItems.length - maxItems

  const openLightbox = (index: number) => {
    if (!showLightbox) return
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const nextImage = () => {
    if (!displayItems || displayItems.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % displayItems.length)
  }

  const prevImage = () => {
    if (!displayItems || displayItems.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') prevImage()
    if (e.key === 'ArrowRight') nextImage()
  }

  const renderMediaItem = (
    item: MediaItem,
    index: number,
    isLightbox = false,
    isInViewOverride?: boolean
  ) => {
    // Enhanced safety checks
    if (!item || typeof item !== 'object') {
      logger.error('MediaGallery: Invalid media item', { item })
      return null
    }

    // Handle both snake_case and camelCase field names with safety
    interface MediaItemWithType {
      media_type?: string
      mediaType?: string
      thumbnail_url?: string
      thumbnailUrl?: string
      mime_type?: string
      mimeType?: string
      alt_text?: string
      altText?: string
      url: string
      [key: string]: unknown
    }
    const mediaItem = item as MediaItemWithType
    let mediaType = mediaItem.media_type || mediaItem.mediaType
    const itemUrl = item.url
    const itemThumbnail = mediaItem.thumbnail_url || mediaItem.thumbnailUrl

    // Validate required fields first
    if (!itemUrl || typeof itemUrl !== 'string' || itemUrl.trim() === '') {
      logger.error('MediaGallery: Media item missing valid URL', { item })
      return null
    }

    // Normalize media_type: detect GIFs from URL or mime_type if not set correctly
    if (!mediaType || typeof mediaType !== 'string') {
      // Try to detect from URL extension
      const urlLower = itemUrl.toLowerCase()
      if (urlLower.endsWith('.gif')) {
        mediaType = 'gif'
      } else if (urlLower.match(/\.(mp4|webm|mov|avi)$/)) {
        mediaType = 'video'
      } else {
        mediaType = 'image'
      }
    } else if (mediaType === 'image') {
      // Normalize: if it's a GIF file but marked as image, fix it
      const urlLower = itemUrl.toLowerCase()
      const mimeType = mediaItem.mime_type || mediaItem.mimeType || ''
      const isGifFile = urlLower.endsWith('.gif') || mimeType === 'image/gif'

      if (isGifFile) {
        mediaType = 'gif'
      }
    }

    if (!mediaType || typeof mediaType !== 'string') {
      logger.error('MediaGallery: Media item missing media type', { item })
      return null
    }

    const isVideo = mediaType === 'video'
    const isGif = mediaType === 'gif'
    const thumbnailUrl =
      itemThumbnail && typeof itemThumbnail === 'string' ? itemThumbnail : itemUrl

    // Safe variants access - validate but don't store if not needed
    if (item.variants && typeof item.variants !== 'object') {
      logger.warn('MediaGallery: Invalid variants object', { variants: item.variants })
    }

    // Lazy render: defer heavy video until in-view in grid (not in lightbox)
    if (isVideo) {
      const showVideoNow = isLightbox || isInViewOverride
      if (!showVideoNow) {
        return (
          <div className="relative w-full h-full">
            <Image
              src={thumbnailUrl}
              alt={mediaItem.alt_text || mediaItem.altText || `Media ${index + 1}`}
              fill
              className="object-cover rounded-lg"
              sizes={isLightbox ? '100vw' : '(max-width: 768px) 50vw, 33vw'}
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Button
                variant="ghost"
                size="lg"
                className="h-16 w-16 p-0 text-white hover:bg-white/20 rounded-full"
                aria-label="Play video"
              >
                <Play className="h-8 w-8 ml-1" />
              </Button>
            </div>
          </div>
        )
      }

      return (
        <VideoPlayer
          src={itemUrl}
          thumbnailUrl={thumbnailUrl}
          duration={item.duration || undefined}
          className="w-full h-full"
          controls={isLightbox}
          autoPlay={isLightbox && !saveData}
        />
      )
    }

    return (
      <div className="relative w-full h-full group">
        <LazyImage
          src={itemUrl}
          alt={
            item.alt_text ||
            ('altText' in item && typeof (item as ClientMediaItem).altText === 'string'
              ? (item as ClientMediaItem).altText
              : null) ||
            `Media ${index + 1}`
          }
          sizes={isLightbox ? '(max-width: 768px) 100vw, 80vw' : '(max-width: 768px) 50vw, 33vw'}
          unoptimized={isGif}
          className="object-cover rounded-lg"
          placeholderSrc={
            itemThumbnail && typeof itemThumbnail === 'string' ? itemThumbnail : undefined
          }
        />

        {/* Play button overlay for videos */}
        {isVideo && !isLightbox && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="lg"
              className="h-16 w-16 p-0 text-white hover:bg-white/20 rounded-full"
              aria-label="Play video"
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Download button for lightbox */}
        {isLightbox && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a')
                link.href = itemUrl
                link.download = `media-${index + 1}`
                link.click()
              }}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              aria-label="Download media"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const getGridLayout = (count: number, isMobile: boolean) => {
    if (count === 1) return { cols: 'grid-cols-1', aspect: 'aspect-video' }
    if (count === 2) return { cols: 'grid-cols-2', aspect: 'aspect-square' }
    if (count === 3) return { cols: 'grid-cols-2', aspect: 'aspect-square' }
    if (count === 4) return { cols: 'grid-cols-2', aspect: 'aspect-square' }
    if (count >= 5) {
      // Mobile: max 2 columns, Desktop: 3 columns
      const cols = isMobile ? 'grid-cols-2' : 'grid-cols-3'
      return { cols, aspect: 'aspect-square' }
    }
    return { cols: 'grid-cols-1', aspect: 'aspect-video' }
  }

  const gridLayout = getGridLayout(displayItems.length, isMobile)

  return (
    <>
      {/* Media Grid */}
      <MediaErrorBoundary>
        <div className={cn('grid gap-2', gridLayout.cols, className)}>
          {displayItems.map((item, index) => (
            <LazyMediaTile
              key={item.id}
              onClick={() => openLightbox(index)}
              className={cn(
                'relative cursor-pointer rounded-lg overflow-hidden',
                gridLayout.aspect,
                showLightbox && 'hover:opacity-90 transition-opacity'
              )}
            >
              {(isInView) => (
                <>
                  {renderMediaItem(item, index, false, isInView)}
                  {/* More items indicator */}
                  {index === maxItems - 1 && remainingCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        +{remainingCount} more
                      </span>
                    </div>
                  )}
                </>
              )}
            </LazyMediaTile>
          ))}
        </div>
      </MediaErrorBoundary>

      {/* Lightbox Modal */}
      {lightboxOpen && showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 h-10 w-10 p-0 text-white hover:bg-white/20"
            aria-label="Close media viewer"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation buttons */}
          {displayItems.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 p-0 text-white hover:bg-white/20"
                aria-label="Previous media"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 p-0 text-white hover:bg-white/20"
                aria-label="Next media"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Media content */}
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] p-4">
            {(() => {
              const currentItem = displayItems[currentIndex]
              return currentItem ? renderMediaItem(currentItem, currentIndex, true) : null
            })()}
          </div>

          {/* Thumbnail strip */}
          {displayItems.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {displayItems.map((item, index) => {
                if (!item || !item.id || !item.url) return null

                // Type-safe property access with fallback
                const thumbnailUrl =
                  item.thumbnail_url && typeof item.thumbnail_url === 'string'
                    ? item.thumbnail_url
                    : ('thumbnailUrl' in item && typeof item.thumbnailUrl === 'string'
                        ? item.thumbnailUrl
                        : null) || item.url
                const mediaType =
                  item.media_type || ('mediaType' in item ? item.mediaType : 'image')

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                      index === currentIndex
                        ? 'border-white'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                    aria-label={`View media item ${index + 1}`}
                    title={`View media item ${index + 1}`}
                  >
                    <Image
                      src={thumbnailUrl || '/placeholder.jpg'}
                      alt={`Thumbnail ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized={mediaType === 'gif'}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white text-sm">
            {displayItems.length > 0
              ? Math.min(Math.max(currentIndex + 1, 1), displayItems.length)
              : 0}{' '}
            / {displayItems.length}
          </div>
        </div>
      )}
    </>
  )
}

// Lazy wrapper for tiles: exposes in-view state to children
function LazyMediaTile({
  children,
  onClick,
  className,
}: {
  children: (isInView: boolean) => React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  useEffect(() => {
    const node = elementRef.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && (entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px 0px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={elementRef} onClick={onClick} className={className}>
      {!isInView ? <div className="absolute inset-0 bg-muted/30 animate-pulse" /> : null}
      {children(isInView)}
    </div>
  )
}

// Image with blur-out-on-load and lazy attribute
function LazyImage({
  src,
  alt,
  sizes,
  unoptimized,
  className,
  placeholderSrc,
}: {
  src: string
  alt: string
  sizes?: string
  unoptimized?: boolean
  className?: string
  placeholderSrc?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={unoptimized}
      loading="lazy"
      placeholder={placeholderSrc ? 'blur' : undefined}
      blurDataURL={placeholderSrc}
      onLoadingComplete={() => setLoaded(true)}
      className={cn(
        className,
        'transition duration-300',
        loaded ? 'blur-0 opacity-100' : 'blur-sm opacity-80'
      )}
    />
  )
}
