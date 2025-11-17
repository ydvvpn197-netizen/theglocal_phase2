'use client'

import { useState, useRef } from 'react'
import { Smile, Film, Image as ImageIcon, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { GifPicker } from './gif-picker'
import { MediaData } from '@/lib/utils/media/media-processing'
import { useToast } from '@/lib/hooks/use-toast'
import { compressImage, formatFileSize } from '@/lib/utils/image-optimization'
import {
  generateVideoThumbnail,
  getVideoDuration,
  getVideoMetadata,
  formatVideoDuration,
} from '@/lib/utils/media/video-utils'
import { validateVideoFile } from '@/lib/utils/validation'
import Image from 'next/image'
import { VideoPlayer } from '@/components/ui/video-player'

interface MediaSelectionToolbarProps {
  onEmojiSelect: (emoji: string) => void
  onGifSelect: (gifUrl: string) => void
  onMediaSelect: (data: MediaData) => void
  onMediaRemove: () => void
  currentMedia: MediaData | null
}

export function MediaSelectionToolbar({
  onEmojiSelect,
  onGifSelect,
  onMediaSelect,
  onMediaRemove,
  currentMedia,
}: MediaSelectionToolbarProps) {
  const { toast } = useToast()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 10MB',
        variant: 'destructive',
      })
      return
    }

    const originalSize = file.size

    try {
      setIsCompressing(true)

      // Compress image on client side
      const compressedFile = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressedFile)

      if (compressedFile.size < originalSize) {
        const savings = (((originalSize - compressedFile.size) / originalSize) * 100).toFixed(0)
        toast({
          title: 'Image Optimized',
          description: `Reduced by ${savings}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)})`,
        })
      }

      onMediaSelect({
        type: 'image',
        file: compressedFile,
        previewUrl,
        isExternal: false,
        originalSize,
        compressedSize: compressedFile.size,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process image',
        variant: 'destructive',
      })
    } finally {
      setIsCompressing(false)
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate video file
    const validation = validateVideoFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      setIsProcessingVideo(true)

      // Generate thumbnail and get metadata
      const [thumbnail, duration, metadata] = await Promise.all([
        generateVideoThumbnail(file),
        getVideoDuration(file),
        getVideoMetadata(file),
      ])

      const previewUrl = URL.createObjectURL(file)

      onMediaSelect({
        type: 'video',
        file,
        previewUrl,
        isExternal: false,
        originalSize: file.size,
        thumbnail,
        duration,
        aspectRatio: metadata.aspectRatio,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process video',
        variant: 'destructive',
      })
    } finally {
      setIsProcessingVideo(false)
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    onGifSelect(gifUrl)
  }

  const handleRemove = () => {
    if (currentMedia && !currentMedia.isExternal && currentMedia.previewUrl) {
      URL.revokeObjectURL(currentMedia.previewUrl)
    }
    onMediaRemove()
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-2 border-none shadow-lg overflow-hidden"
            align="start"
            side="top"
            sideOffset={8}
          >
            <EmojiPicker
              onEmojiSelect={(emoji) => {
                onEmojiSelect(emoji)
                setEmojiPickerOpen(false)
              }}
              embedded={true}
              onClose={() => setEmojiPickerOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Add GIF">
              <Film className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select a GIF</DialogTitle>
            </DialogHeader>
            <GifPicker onGifSelect={handleGifSelect} onFileSelect={() => {}} />
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Add image"
          onClick={() => imageInputRef.current?.click()}
          disabled={isCompressing}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Add video"
          onClick={() => videoInputRef.current?.click()}
          disabled={isProcessingVideo}
        >
          <Video className="h-4 w-4" />
        </Button>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={isCompressing}
          aria-label="Select image file"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleVideoSelect}
          className="hidden"
          disabled={isProcessingVideo}
          aria-label="Select video file"
        />
      </div>

      {/* Media Preview */}
      {currentMedia && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {currentMedia.type === 'image' && 'Image'}
              {currentMedia.type === 'gif' && 'GIF'}
              {currentMedia.type === 'video' && 'Video'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
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
      )}
    </div>
  )
}
