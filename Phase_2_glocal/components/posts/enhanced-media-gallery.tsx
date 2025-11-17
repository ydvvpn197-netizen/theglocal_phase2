'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  Upload,
  X,
  GripVertical,
  Play,
  Image as ImageIcon,
  FileVideo,
  AlertCircle,
  Edit3,
  Type,
  Eye,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatFileSize } from '@/lib/utils/image-optimization'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { safeArrayAccess } from '@/lib/utils/validation'
import { formatDuration } from '@/lib/utils/media/video-processing'
import {
  startChunkedUpload,
  ChunkedUploader,
  UploadProgress,
  UploadResult,
} from '@/lib/utils/chunked-upload'

export interface MediaItem {
  id: string
  url: string
  variants?: Record<string, unknown>
  mediaType: 'image' | 'video' | 'gif'
  duration?: number
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  altText?: string
  displayOrder?: number
}

interface EnhancedMediaGalleryProps {
  onMediaSelect: (media: MediaItem[]) => void
  onMediaRemove: (mediaId: string) => void
  currentMedia: MediaItem[]
  maxItems?: number
  className?: string
  disabled?: boolean
  allowReordering?: boolean
  allowEditing?: boolean
  showLightbox?: boolean
}

interface MediaEditState {
  mediaId: string
  altText: string
  displayOrder: number
  rotation: number
  brightness: number
  contrast: number
  saturation: number
}

interface LightboxState {
  isOpen: boolean
  currentIndex: number
  media: MediaItem[]
}

export function EnhancedMediaGallery({
  onMediaSelect,
  onMediaRemove,
  currentMedia,
  maxItems = 10,
  className = '',
  disabled = false,
  allowReordering = true,
  allowEditing = true,
  showLightbox = true,
}: EnhancedMediaGalleryProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [activeUploaders, setActiveUploaders] = useState<Map<string, ChunkedUploader>>(new Map())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingMedia, setEditingMedia] = useState<MediaEditState | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    currentIndex: 0,
    media: [],
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (disabled || isUploading) return

      const fileArray = Array?.from(files)
      const remainingSlots = maxItems - currentMedia?.length
      const filesToProcess = fileArray?.slice(0, remainingSlots)

      if (filesToProcess?.length === 0) {
        return
      }

      console?.log(`🚀 Starting enhanced media upload for ${filesToProcess?.length} files`)

      setIsUploading(true)

      // Start chunked upload for each file
      const newUploaders = new Map(activeUploaders)
      const newProgress: UploadProgress[] = []

      for (const file of filesToProcess) {
        // Validate file
        const isImage = file?.type.startsWith('image/')
        const isVideo = file?.type.startsWith('video/')
        const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024

        if (!isImage && !isVideo) {
          const errorProgress: UploadProgress = {
            fileId: `error-${Date?.now()}-${Math?.random()}`,
            fileName: file?.name,
            loaded: 0,
            total: file?.size,
            percentage: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'error',
            error: 'Unsupported file type',
          }
          newProgress?.push(errorProgress)
          continue
        }

        if (file?.size > maxSize) {
          const errorProgress: UploadProgress = {
            fileId: `error-${Date?.now()}-${Math?.random()}`,
            fileName: file?.name,
            loaded: 0,
            total: file?.size,
            percentage: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'error',
            error: `File too large (max ${isVideo ? '100MB' : '10MB'})`,
          }
          newProgress?.push(errorProgress)
          continue
        }

        // Start chunked upload
        const uploader = startChunkedUpload(file, {
          chunkSize: 1024 * 1024, // 1MB chunks
          maxRetries: 3,
          onProgress: (progress) => {
            setUploadProgress((prev) => {
              const updated = [...prev]
              const index = updated?.findIndex((p) => p?.fileId === progress?.fileId)
              if (index >= 0) {
                updated[index] = progress
              } else {
                updated?.push(progress)
              }
              return updated
            })
          },
          onComplete: (result: UploadResult) => {
            console?.log(`✅ Upload completed for ${file?.name}:`, result)

            // Validate upload result before processing
            if (!result || typeof result !== 'object') {
              console?.error('Invalid upload result:', result)
              return
            }

            if (!result.id || !result.url || !result.mediaType) {
              console?.error('Upload result missing required fields:', result)
              return
            }

            // Convert to MediaItem format with display order
            const mediaResult: MediaItem = {
              id: result.id,
              url: result.url,
              variants: (result.variants as Record<string, unknown>) || {},
              mediaType: result.mediaType,
              duration: result.duration || undefined,
              thumbnailUrl: result.thumbnailUrl || result.url,
              fileSize: result.fileSize || file?.size || 0,
              mimeType: result.mimeType || file?.type || '',
              altText: result.altText || `${result.mediaType} attachment`,
              displayOrder: currentMedia?.length,
            }

            // Add to current media with proper ordering
            const newMedia = [...currentMedia, mediaResult].sort(
              (a, b) => (a?.displayOrder || 0) - (b?.displayOrder || 0)
            )
            onMediaSelect(newMedia)

            // Remove uploader
            setActiveUploaders((prev) => {
              const updated = new Map(prev)
              updated.delete(result.id)
              return updated
            })

            // Remove progress after delay
            setTimeout(() => {
              setUploadProgress((prev) => prev?.filter((p) => p?.fileId !== result.id))
            }, 2000)
          },
          onError: (error) => {
            console?.error(`❌ Upload failed for ${file?.name}:`, error)

            setUploadProgress((prev) =>
              prev?.map((p) =>
                p?.fileName === file?.name
                  ? { ...p, status: 'error' as const, error: error?.message }
                  : p
              )
            )

            // Remove from active uploaders
            setActiveUploaders((prev) => {
              const updated = new Map(prev)
              for (const [id, uploader] of prev?.entries()) {
                if (uploader?.getUploadId() && uploader?.getUploadId().includes(file?.name)) {
                  updated?.delete(id)
                  break
                }
              }
              return updated
            })
          },
        })

        newUploaders?.set(uploader?.getUploadId(), uploader)

        // Initialize progress
        const initialProgress: UploadProgress = {
          fileId: uploader?.getUploadId(),
          fileName: file?.name,
          loaded: 0,
          total: file?.size,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0,
          status: 'preparing',
        }
        newProgress?.push(initialProgress)
      }

      setActiveUploaders(newUploaders)
      setUploadProgress(newProgress)

      // Auto-disable uploading state when all uploads complete
      const checkComplete = () => {
        if (newUploaders?.size === 0) {
          setIsUploading(false)
        } else {
          setTimeout(checkComplete, 1000)
        }
      }
      setTimeout(checkComplete, 1000)
    },
    [currentMedia, maxItems, onMediaSelect, disabled, isUploading, activeUploaders]
  )

  // Drag and drop for file upload
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !isUploading) {
        setIsDragOver(true)
      }
    },
    [disabled, isUploading]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (disabled || isUploading) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files)
      }
    },
    [disabled, isUploading, handleFileSelect]
  )

  // Drag and drop for reordering
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!allowReordering) return
      setDraggedIndex(index)
      e.dataTransfer.effectAllowed = 'move'
    },
    [allowReordering]
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!allowReordering || draggedIndex === null) return
      e.preventDefault()
      setDragOverIndex(index)
    },
    [allowReordering, draggedIndex]
  )

  const handleDragEnd = useCallback(() => {
    if (!allowReordering) return

    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newMedia = [...currentMedia]
      const draggedItem = newMedia[draggedIndex]

      if (!draggedItem) return

      // Remove dragged item
      newMedia?.splice(draggedIndex, 1)

      // Insert at new position
      newMedia?.splice(dragOverIndex, 0, draggedItem)

      // Update display order
      const reorderedMedia = newMedia?.map((item, index) => ({
        ...item,
        displayOrder: index,
      }))

      onMediaSelect(reorderedMedia)
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [allowReordering, draggedIndex, dragOverIndex, currentMedia, onMediaSelect])

  const handleMediaEdit = useCallback(
    (media: MediaItem) => {
      if (!allowEditing) return

      setEditingMedia({
        mediaId: media?.id,
        altText: media?.altText || '',
        displayOrder: media?.displayOrder || 0,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      })
    },
    [allowEditing]
  )

  const handleSaveEdit = useCallback(() => {
    if (!editingMedia) return

    const updatedMedia = currentMedia?.map((item) =>
      item?.id === editingMedia?.mediaId
        ? {
            ...item,
            altText: editingMedia?.altText,
            displayOrder: editingMedia?.displayOrder,
          }
        : item
    )

    onMediaSelect(updatedMedia?.sort((a, b) => (a?.displayOrder || 0) - (b?.displayOrder || 0)))
    setEditingMedia(null)
  }, [editingMedia, currentMedia, onMediaSelect])

  const openLightbox = useCallback(
    (index: number) => {
      if (!showLightbox) return

      setLightbox({
        isOpen: true,
        currentIndex: index,
        media: currentMedia,
      })
    },
    [showLightbox, currentMedia]
  )

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    setLightbox((prev) => {
      if (!prev?.media || prev?.media.length === 0) return prev

      const newIndex =
        direction === 'next'
          ? (prev?.currentIndex + 1) % prev?.media.length
          : prev?.currentIndex === 0
            ? prev?.media.length - 1
            : prev?.currentIndex - 1

      // Ensure index is within bounds
      const boundedIndex = Math?.max(0, Math?.min(newIndex, prev?.media.length - 1))

      return { ...prev, currentIndex: boundedIndex }
    })
  }, [])

  const handleFileClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files)
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelect]
  )

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Upload Area */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            disabled && 'opacity-50 cursor-not-allowed',
            currentMedia?.length >= maxItems && 'hidden'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
            aria-label="Select media files to upload"
            title="Select media files to upload"
          />

          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isDragOver ? 'Drop files here' : 'Drag & drop media files'}
              </p>
              <p className="text-xs text-muted-foreground">
                Images and videos up to {maxItems} files
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFileClick}
                disabled={disabled || isUploading}
              >
                Choose Files
              </Button>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress?.length > 0 && (
          <div className="space-y-3">
            {uploadProgress?.map((progress) => (
              <div key={progress?.fileId} className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate font-medium">{progress?.fileName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {formatFileSize(progress?.loaded)} / {formatFileSize(progress?.total)}
                        </span>
                        <span className="text-xs">({progress?.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Progress value={progress?.percentage} className="h-2" />

                {progress?.status === 'error' && (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>{progress?.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Media Grid */}
        {currentMedia?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {currentMedia
              .sort((a, b) => (a?.displayOrder || 0) - (b?.displayOrder || 0))
              .map((media, index) => (
                <div
                  key={media?.id}
                  className={cn(
                    'group relative bg-muted rounded-lg overflow-hidden aspect-square cursor-pointer transition-all',
                    draggedIndex === index && 'opacity-50 scale-95',
                    dragOverIndex === index && 'ring-2 ring-primary'
                  )}
                  draggable={allowReordering}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openLightbox(index)}
                >
                  {/* Media Content */}
                  <div className="w-full h-full relative">
                    {/* Enhanced validation for media rendering */}
                    {media &&
                    media?.url &&
                    (media?.mediaType === 'image' || media?.mediaType === 'gif') ? (
                      <Image
                        src={media?.thumbnailUrl || media?.url}
                        alt={media?.altText || 'Media attachment'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        loading="lazy"
                        quality={85}
                        unoptimized={media?.mediaType === 'gif'}
                        onError={(e) => {
                          console?.error('Image load error for media:', media?.id, e)
                        }}
                      />
                    ) : media && media?.url && media?.mediaType === 'video' ? (
                      <div className="w-full h-full bg-black/20 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                        {media?.duration && typeof media?.duration === 'number' && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                            {formatDuration(media?.duration)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-gray-500" />
                        <span className="ml-2 text-sm text-gray-500">Invalid media</span>
                      </div>
                    )}
                  </div>

                  {/* Media Type Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {media?.mediaType === 'image' && <ImageIcon className="h-3 w-3 mr-1" />}
                      {media?.mediaType === 'video' && <FileVideo className="h-3 w-3 mr-1" />}
                      {media?.mediaType === 'gif' && '🎬'}
                      {media?.mediaType.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Drag Handle */}
                  {allowReordering && (
                    <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Actions Menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-6 w-6 p-0">
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {allowEditing && (
                          <>
                            <DropdownMenuItem onClick={() => handleMediaEdit(media)}>
                              <Type className="h-4 w-4 mr-2" />
                              Edit Alt Text
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openLightbox(index)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Size
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => onMediaRemove(media?.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Display Order */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-1 rounded">
                    #{(media?.displayOrder || index) + 1}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Media Count */}
        {currentMedia?.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {currentMedia?.length} of {maxItems} media items
          </div>
        )}
      </div>

      {/* Edit Media Dialog */}
      <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
          </DialogHeader>

          {editingMedia && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="alt-text">Alt Text</Label>
                <Textarea
                  id="alt-text"
                  value={editingMedia?.altText}
                  onChange={(e) =>
                    setEditingMedia((prev) => (prev ? { ...prev, altText: e?.target.value } : null))
                  }
                  placeholder="Describe this media for accessibility..."
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {editingMedia?.altText.length}/200 characters
                </div>
              </div>

              <div>
                <Label htmlFor="display-order">Display Order</Label>
                <Input
                  id="display-order"
                  type="number"
                  min="0"
                  max={currentMedia?.length - 1}
                  value={editingMedia?.displayOrder}
                  onChange={(e) =>
                    setEditingMedia((prev) =>
                      prev ? { ...prev, displayOrder: parseInt(e?.target.value) || 0 } : null
                    )
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMedia(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Lightbox */}
      <Dialog
        open={lightbox?.isOpen}
        onOpenChange={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          {lightbox?.media[lightbox?.currentIndex] && (
            <div className="relative">
              {/* Navigation */}
              {lightbox?.media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => navigateLightbox('prev')}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => navigateLightbox('next')}
                  >
                    ›
                  </Button>
                </>
              )}

              {/* Media Display */}
              <div className="flex items-center justify-center bg-black min-h-[400px] max-h-[80vh]">
                {lightbox?.media[lightbox?.currentIndex]?.mediaType === 'video' ? (
                  <video
                    src={lightbox?.media[lightbox?.currentIndex]?.url}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <Image
                    src={lightbox?.media[lightbox?.currentIndex]?.url ?? ''}
                    alt={lightbox?.media[lightbox?.currentIndex]?.altText ?? ''}
                    width={800}
                    height={600}
                    className="max-w-full max-h-full object-contain"
                    unoptimized={lightbox?.media[lightbox?.currentIndex]?.mediaType === 'gif'}
                  />
                )}
              </div>

              {/* Media Info */}
              <div className="p-4 bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {safeArrayAccess(lightbox?.media, lightbox?.currentIndex)?.altText ||
                        'Media attachment'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lightbox?.currentIndex + 1} of {lightbox?.media.length} •{' '}
                      {formatFileSize(
                        safeArrayAccess(lightbox?.media, lightbox?.currentIndex)?.fileSize || 0
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentMedia = lightbox?.media?.[lightbox?.currentIndex || 0]
                        if (currentMedia?.url) {
                          window?.open(currentMedia.url, '_blank')
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentMedia = lightbox?.media?.[lightbox?.currentIndex || 0]
                        if (currentMedia) {
                          handleMediaEdit(currentMedia)
                        }
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
