'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils/media/video-processing'
import { VideoPlayerProps } from '@/lib/types/api.types'

export function VideoPlayer({
  src,
  thumbnailUrl,
  duration,
  className = '',
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(muted ? 0 : 1)
  const [isMuted, setIsMuted] = useState(muted)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      setHasError(true)
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const time = parseFloat(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.muted = false
      video.volume = volume
      setIsMuted(false)
    } else {
      video.muted = true
      setIsMuted(true)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      video.requestFullscreen()
    }
  }

  const restart = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = 0
    setCurrentTime(0)
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">Failed to load video</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative group bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={thumbnailUrl}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Controls overlay */}
      {controls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Top controls */}
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={restart}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={togglePlay}
              className="h-16 w-16 p-0 text-white hover:bg-white/20 rounded-full"
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </Button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Progress bar */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={videoRef.current?.duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Seek video"
                title="Seek video"
              />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    aria-label="Volume control"
                    title="Volume control"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-white text-sm">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                {duration && (
                  <>
                    <span>/</span>
                    <span>{formatDuration(duration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
