'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/ui/video-player'
import { MediaErrorBoundary } from '@/components/media/media-error-boundary'
import { cn } from '@/lib/utils'

interface MediaItem {
  id: string
  type: 'image' | 'gif' | 'video'
  url: string
  alt?: string
  thumbnail?: string
  duration?: number
}

interface MediaLightboxProps {
  isOpen: boolean
  onClose: () => void
  media: MediaItem[]
  initialIndex?: number
}

export function MediaLightbox({ isOpen, onClose, media, initialIndex = 0 }: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touching, setTouching] = useState(false)
  const [imageScale, setImageScale] = useState(1)
  const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 })
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null)

  // Reset to initial index when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setIsPlaying(false)
    }
  }, [isOpen, initialIndex])

  const goToPrevious = useCallback(() => {
    if (media.length === 0) return
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1))
    setIsPlaying(false)
  }, [media.length])

  const goToNext = useCallback(() => {
    if (media.length === 0) return
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0))
    setIsPlaying(false)
  }, [media.length])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  // Touch handlers for swipe navigation and pinch-to-zoom
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touches = e.touches
    if (touches.length === 1) {
      const t0 = touches.item(0)!
      setTouchStart({ x: t0.clientX, y: t0.clientY })
      setTouching(true)
    } else if (touches.length === 2) {
      const t0 = touches.item(0)!
      const t1 = touches.item(1)!
      const dx = t0.clientX - t1.clientX
      const dy = t0.clientY - t1.clientY
      setPinchStartDistance(Math.hypot(dx, dy))
      setTouching(true)
    }
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touching) return
      const touches = e.touches
      if (touches.length === 2 && pinchStartDistance) {
        const t0 = touches.item(0)!
        const t1 = touches.item(1)!
        const dx = t0.clientX - t1.clientX
        const dy = t0.clientY - t1.clientY
        const dist = Math.hypot(dx, dy)
        const scale = Math.max(1, Math.min(3, (dist / pinchStartDistance) * imageScale))
        setImageScale(scale)
      }
      if (touches.length === 1 && imageScale > 1) {
        // Pan when zoomed in
        const t0 = touches.item(0)!
        const dx = t0.clientX - (touchStart?.x || 0)
        const dy = t0.clientY - (touchStart?.y || 0)
        setImageTranslate({ x: dx, y: dy })
      }
    },
    [touching, pinchStartDistance, imageScale, touchStart]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const changed = e.changedTouches
      if (touchStart && changed.length === 1 && imageScale === 1) {
        const t0 = changed.item(0)!
        const dx = t0.clientX - touchStart.x
        const dy = t0.clientY - touchStart.y
        if (Math.abs(dx) > 50 && Math.abs(dy) < 60) {
          if (dx > 0) {
            goToPrevious()
          } else {
            goToNext()
          }
        }
      }
      setTouching(false)
      setTouchStart(null)
      setPinchStartDistance(null)
      if (imageScale === 1) {
        setImageTranslate({ x: 0, y: 0 })
      }
    },
    [touchStart, goToNext, goToPrevious, imageScale]
  )

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case ' ':
          e.preventDefault()
          if (media[currentIndex]?.type === 'video') {
            togglePlayPause()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, media, goToNext, goToPrevious, onClose, togglePlayPause])

  if (!isOpen || media.length === 0) return null

  const currentMedia = media[currentIndex]

  // Safety check: if currentMedia is undefined, close lightbox or fallback to first item
  if (!currentMedia) {
    if (media.length > 0 && currentIndex !== 0) {
      setCurrentIndex(0)
      return null // Re-render with corrected index
    } else {
      onClose()
      return null
    }
  }

  return (
    <MediaErrorBoundary>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          aria-label="Close media viewer"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              aria-label="Previous media"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              aria-label="Next media"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Media content */}
        <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center p-4">
          {currentMedia.type === 'video' ? (
            <div className="relative w-full h-full">
              <VideoPlayer
                src={currentMedia.url}
                poster={currentMedia.thumbnail}
                title={currentMedia.alt}
                autoPlay={isPlaying}
                muted={false}
                controls={true}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={currentMedia.url}
                alt={currentMedia.alt || 'Media content'}
                fill
                className="object-contain"
                unoptimized={currentMedia.type === 'gif'}
                priority
                placeholder={currentMedia.thumbnail ? 'blur' : undefined}
                blurDataURL={currentMedia.thumbnail || undefined}
                style={{
                  transform: `translate(${imageTranslate.x}px, ${imageTranslate.y}px) scale(${imageScale})`,
                  transition: touching ? 'none' : 'transform 200ms ease',
                }}
              />
            </div>
          )}
        </div>

        {/* Media counter */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        )}

        {/* Thumbnail strip */}
        {media.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
            {media.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                  index === currentIndex
                    ? 'border-white scale-110'
                    : 'border-white/50 hover:border-white/80'
                )}
                aria-label={`View media ${index + 1} of ${media.length}`}
              >
                <Image
                  src={item.thumbnail || item.url}
                  alt={item.alt || `Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={item.type === 'gif'}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </MediaErrorBoundary>
  )
}
