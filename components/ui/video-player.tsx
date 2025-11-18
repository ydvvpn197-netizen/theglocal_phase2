'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatVideoDuration } from '@/lib/utils/media/video-utils'
import { logger } from '@/lib/utils/logger'

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
  onPlay?: () => void
  onPause?: () => void
  sources?: Array<{ src: string; label: string }>
}

export function VideoPlayer({
  src,
  poster,
  title, // Used for accessibility
  autoPlay = false,
  muted = false,
  controls = true,
  className,
  onPlay,
  onPause,
  sources = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [_volume, _setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPiP, setIsPiP] = useState(false)
  const [currentSource, setCurrentSource] = useState(src)

  // Calculate aspect ratio from video metadata
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = video
      setAspectRatio(videoWidth / videoHeight)
      setDuration(video.duration)
      setIsLoading(false)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [src])

  // Auto-play with IntersectionObserver
  useEffect(() => {
    if (!autoPlay || !videoRef.current) return

    const video = videoRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Auto-play failed, user interaction required
            })
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [autoPlay])

  // Event handlers
  const handlePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.play()
    setIsPlaying(true)
    setIsBuffering(false)
    onPlay?.()
  }, [onPlay])

  const handlePause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.pause()
    setIsPlaying(false)
    onPause?.()
  }, [onPause])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setCurrentTime(video.currentTime)
  }, [])

  const handleWaiting = useCallback(() => {
    // Fired when playback has stopped because of a temporary lack of data
    setIsBuffering(true)
  }, [])

  const handlePlaying = useCallback(() => {
    // Fired when playback is ready to start after having been paused or delayed due to lack of data
    setIsBuffering(false)
  }, [])

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    _setVolume(video.volume)
    setIsMuted(video.muted)
  }, [])

  const handleRateChange = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
  }, [])

  const handleSourceChange = useCallback(
    (nextSrc: string) => {
      const video = videoRef.current
      if (!video || !nextSrc || nextSrc === currentSource) return
      const wasPlaying = isPlaying
      video.pause()
      video.src = nextSrc
      setCurrentSource(nextSrc)
      video.load()
      if (wasPlaying) {
        video.play().catch(() => {})
      }
    },
    [currentSource, isPlaying]
  )

  interface DocumentWithPiP {
    pictureInPictureElement?: Element | null
    exitPictureInPicture?: () => Promise<void>
  }

  interface VideoElementWithPiP {
    requestPictureInPicture?: () => Promise<PictureInPictureWindow>
  }

  const togglePiP = useCallback(async () => {
    const video = videoRef.current as (HTMLVideoElement & VideoElementWithPiP) | null
    if (!video) return
    try {
      const doc = document as Document & DocumentWithPiP
      if (doc.pictureInPictureElement && doc.exitPictureInPicture) {
        await doc.exitPictureInPicture()
        setIsPiP(false)
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture()
        setIsPiP(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      const progressBar = progressRef.current
      if (!video || !progressBar || !duration) return

      const rect = progressBar.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * duration

      video.currentTime = newTime
      setCurrentTime(newTime)
    },
    [duration]
  )

  const handleProgressDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return
      handleSeek(e)
    },
    [isDragging, handleSeek]
  )

  const startDrag = useCallback(() => {
    setIsDragging(true)
  }, [])

  const stopDrag = useCallback(() => {
    setIsDragging(false)
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    // Type-safe fullscreen API handling
    interface ExtendedElement extends Element {
      webkitRequestFullscreen?: () => Promise<void>
      msRequestFullscreen?: () => Promise<void>
    }

    interface ExtendedDocument extends Document {
      webkitExitFullscreen?: () => Promise<void>
      msExitFullscreen?: () => Promise<void>
    }

    if (!isFullscreen) {
      const extContainer = container as ExtendedElement
      if (container.requestFullscreen) {
        container.requestFullscreen().catch((error) => {
          logger.error('Failed to enter fullscreen', error instanceof Error ? error : undefined, {
            context: 'video-player',
          })
        })
      } else if (extContainer.webkitRequestFullscreen) {
        extContainer.webkitRequestFullscreen().catch((error) => {
          logger.error(
            'Failed to enter fullscreen (webkit)',
            error instanceof Error ? error : undefined,
            {
              context: 'video-player',
            }
          )
        })
      } else if (extContainer.msRequestFullscreen) {
        extContainer.msRequestFullscreen().catch((error) => {
          logger.error(
            'Failed to enter fullscreen (ms)',
            error instanceof Error ? error : undefined,
            {
              context: 'video-player',
            }
          )
        })
      }
    } else {
      const extDocument = document as ExtendedDocument
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((error) => {
          logger.error('Failed to exit fullscreen', error instanceof Error ? error : undefined, {
            context: 'video-player',
          })
        })
      } else if (extDocument.webkitExitFullscreen) {
        extDocument.webkitExitFullscreen().catch((error) => {
          logger.error(
            'Failed to exit fullscreen (webkit)',
            error instanceof Error ? error : undefined,
            {
              context: 'video-player',
            }
          )
        })
      } else if (extDocument.msExitFullscreen) {
        extDocument.msExitFullscreen().catch((error) => {
          logger.error(
            'Failed to exit fullscreen (ms)',
            error instanceof Error ? error : undefined,
            {
              context: 'video-player',
            }
          )
        })
      }
    }
  }, [isFullscreen])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlayPause()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause, toggleFullscreen, toggleMute, duration])

  // Mouse/touch controls
  const handleMouseEnter = useCallback(() => {
    setShowControls(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setShowControls(false)
    }
  }, [isDragging])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
  }, [])

  // Container style with dynamic aspect ratio
  const containerStyle = aspectRatio
    ? { aspectRatio: aspectRatio.toString() }
    : { aspectRatio: '16/9' } // fallback

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-black rounded-lg overflow-hidden group',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={currentSource}
        poster={poster}
        title={title} // Accessibility: video description
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onVolumeChange={handleVolumeChange}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        muted={muted}
        playsInline
        preload="metadata"
        aria-label={title || 'Video content'}
      />

      {/* Loading indicator */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Custom Controls Overlay */}
      {controls && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            showControls && 'opacity-100'
          )}
        >
          {/* Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20 rounded-full p-4"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12" />}
            </Button>
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3 text-white">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                className="flex-1 bg-white/30 rounded-full h-1 cursor-pointer relative"
                onClick={handleSeek}
                onMouseDown={startDrag}
                onMouseUp={stopDrag}
                onMouseMove={handleProgressDrag}
                onMouseLeave={stopDrag}
              >
                <div
                  className="bg-white rounded-full h-full transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Time Display */}
              <span className="text-sm font-mono whitespace-nowrap">
                {formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}
              </span>

              {/* Volume Control */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              {/* Playback Rate */}
              <div className="ml-1 flex items-center gap-1">
                {[1, 1.25, 1.5, 2].map((rate) => (
                  <Button
                    key={rate}
                    variant={playbackRate === rate ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleRateChange(rate)}
                    className={cn(
                      'text-white hover:bg-white/20',
                      playbackRate === rate && 'bg-white/20'
                    )}
                    aria-label={`Set playback rate ${rate}x`}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>

              {/* PiP */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePiP}
                className="text-white hover:bg-white/20"
                aria-label="Toggle Picture in Picture"
              >
                {isPiP ? 'PiP On' : 'PiP'}
              </Button>

              {/* Quality (if sources provided) */}
              {Array.isArray(sources) && sources.length > 0 && (
                <div className="ml-1 flex items-center gap-1">
                  {sources.map((s: { src: string; label: string }) => (
                    <Button
                      key={s.src}
                      variant={currentSource === s.src ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleSourceChange(s.src)}
                      className={cn(
                        'text-white hover:bg-white/20',
                        currentSource === s.src && 'bg-white/20'
                      )}
                      aria-label={`Set video quality to ${s.label}`}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
