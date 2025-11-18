'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RotateCw, RotateCcw } from 'lucide-react'
import { processImage, type CropArea } from '@/lib/utils/image-processing'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export interface AspectRatio {
  label: string
  value: number | undefined
}

const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
]

interface ImageEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageFile: File | null
  onSave: (processedFile: File) => void
}

export function ImageEditor({ open, onOpenChange, imageFile, onSave }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load image when file changes
  useEffect(() => {
    if (imageFile && open) {
      const url = URL.createObjectURL(imageFile)
      setImageSrc(url)

      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
      }
      img.src = url

      // Reset editor state
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setAspectRatio(undefined)
      setCroppedAreaPixels(null)

      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setImageSrc(null)
      setImageSize(null)
    }
  }, [imageFile, open])

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleRotate = (direction: 'left' | 'right') => {
    setRotation((prev) => (direction === 'right' ? prev + 90 : prev - 90))
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setAspectRatio(undefined)
    setCroppedAreaPixels(null)
  }

  const handleSave = async () => {
    if (!imageFile || !imageSize) {
      toast({
        title: 'Error',
        description: 'Image not loaded',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      // If no crop area, use full image
      let cropArea: CropArea | undefined
      if (croppedAreaPixels) {
        cropArea = {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        }
      }

      const processedFile = await processImage(imageFile, {
        crop: cropArea,
        imageSize,
        rotation,
        maxWidth: 1920,
        maxHeight: 1920,
        maintainAspectRatio: true,
        quality: 0.8,
      })

      onSave(processedFile)
      onOpenChange(false)
      toast({
        title: 'Image processed',
        description: 'Your image has been optimized and is ready to upload',
      })
    } catch (error) {
      console.error('Image processing error:', error)
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    handleReset()
    onOpenChange(false)
  }

  if (!imageSrc || !imageFile) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative min-h-0 overflow-hidden" ref={containerRef}>
          <div className="absolute inset-0 w-full h-full">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid={true}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                },
                cropAreaStyle: {
                  border: '2px solid hsl(var(--primary))',
                },
              }}
            />
          </div>
        </div>

        <div className="border-t p-4 space-y-4">
          {/* Zoom Control */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Zoom"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Rotation */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleRotate('left')}
                aria-label="Rotate left"
                className="min-h-[44px] min-w-[44px]"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleRotate('right')}
                aria-label="Rotate right"
                className="min-h-[44px] min-w-[44px]"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Aspect:</span>
              {ASPECT_RATIOS.map((ratio) => (
                <Button
                  key={ratio.label}
                  type="button"
                  variant={aspectRatio === ratio.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio(ratio.value)}
                  className="min-h-[44px]"
                >
                  {ratio.label}
                </Button>
              ))}
            </div>

            {/* Reset */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="ml-auto min-h-[44px]"
            >
              Reset
            </Button>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="min-h-[44px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
