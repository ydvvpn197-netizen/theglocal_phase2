'use client'

import { useState } from 'react'
import { X, Image as ImageIcon, Film, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GifPicker } from './gif-picker'
import { VideoPlayer } from '@/components/ui/video-player'
import { useToast } from '@/lib/hooks/use-toast'
import { formatVideoDuration } from '@/lib/utils/media/video-utils'
import {
  MediaData,
  processImageFile,
  processVideoFile,
  processGifFile,
  processExternalGif,
  cleanupMediaData,
} from '@/lib/utils/media/media-processing'
import Image from 'next/image'

interface MediaUploadProps {
  onMediaSelect: (data: MediaData) => void
  onMediaRemove: () => void
  currentMedia: MediaData | null
}

// MediaData interface moved to lib/utils/media-processing.ts

export function MediaUpload({ onMediaSelect, onMediaRemove, currentMedia }: MediaUploadProps) {
  const { toast } = useToast()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsCompressing(true)
      const mediaData = await processImageFile(file)
      onMediaSelect(mediaData)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      })
    } finally {
      setIsCompressing(false)
    }
  }

  const handleGifSelect = (gifUrl: string, isExternal: boolean) => {
    if (isExternal) {
      onMediaSelect(processExternalGif(gifUrl))
    } else {
      // This shouldn't happen in the current flow, but keeping for compatibility
      onMediaSelect({
        type: 'gif',
        previewUrl: gifUrl,
        isExternal: false,
      })
    }
  }

  const handleGifFileSelect = async (file: File) => {
    try {
      const mediaData = processGifFile(file)
      onMediaSelect(mediaData)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process GIF',
        variant: 'destructive',
      })
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsProcessingVideo(true)
      const mediaData = await processVideoFile(file)
      onMediaSelect(mediaData)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process video',
        variant: 'destructive',
      })
    } finally {
      setIsProcessingVideo(false)
    }
  }

  const handleRemove = () => {
    cleanupMediaData(currentMedia)
    onMediaRemove()
  }

  // If media is already selected, show preview
  if (currentMedia) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Media</label>
        <div className="relative w-full h-48 rounded-md overflow-hidden border border-border">
          {currentMedia.type === 'video' ? (
            <VideoPlayer
              src={currentMedia.previewUrl}
              poster={currentMedia.thumbnail}
              title="Video preview"
              autoPlay={false}
              muted={true}
              controls={true}
              className="w-full h-full"
            />
          ) : (
            <Image
              src={currentMedia.previewUrl}
              alt="Media preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              quality={85}
              unoptimized={currentMedia.type === 'gif'}
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="absolute top-2 right-2 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
          {currentMedia.type === 'gif' && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              <Film className="h-3 w-3 inline mr-1" />
              GIF
            </div>
          )}
          {currentMedia.type === 'video' && currentMedia.duration && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              <Video className="h-3 w-3 inline mr-1" />
              {formatVideoDuration(currentMedia.duration)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Media (Optional)</label>

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </TabsTrigger>
          <TabsTrigger value="gif">
            <Film className="h-4 w-4 mr-2" />
            GIF
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="h-4 w-4 mr-2" />
            Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4">
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {isCompressing ? 'Optimizing...' : 'Click to upload image'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">Max 10MB (will be optimized)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isCompressing}
            />
          </label>
        </TabsContent>

        <TabsContent value="gif" className="mt-4">
          <GifPicker onGifSelect={handleGifSelect} onFileSelect={handleGifFileSelect} />
        </TabsContent>

        <TabsContent value="video" className="mt-4">
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
            <Video className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {isProcessingVideo ? 'Processing video...' : 'Click to upload video'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">Max 50MB (MP4, WebM, MOV)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideoSelect}
              className="hidden"
              disabled={isProcessingVideo}
            />
          </label>
        </TabsContent>
      </Tabs>
    </div>
  )
}
