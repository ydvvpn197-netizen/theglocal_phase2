'use client'

import React, { useRef, useState } from 'react'
import { useVideoUpload } from '@/lib/hooks/useVideoUpload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Video, X, CheckCircle, AlertCircle } from 'lucide-react'

interface VideoUploadProps {
  onUploadComplete?: (url: string, thumbnail?: string) => void
  onUploadError?: (error: string) => void
  folder?: string
  className?: string
  disabled?: boolean
}

export function VideoUpload({
  onUploadComplete,
  onUploadError,
  folder = 'videos',
  className = '',
  disabled = false,
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const { isUploading, progress, error, url, thumbnail, upload, reset } = useVideoUpload({
    folder,
    onSuccess: onUploadComplete,
    onError: onUploadError,
  })

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      upload(file)
    } else {
      onUploadError?.('Please select a valid video file')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleReset = () => {
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (url) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="relative">
          <video
            src={url}
            controls
            className="w-full max-w-md mx-auto rounded-lg"
            poster={thumbnail || undefined}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center text-green-600">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">Video uploaded successfully</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          aria-label="Select video file"
        />

        <div className="space-y-4">
          {isUploading ? (
            <>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Uploading video...</p>
                <Progress value={progress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <Video className="h-12 w-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Drop your video here, or click to select
                </p>
                <p className="text-xs text-gray-500">
                  Supports MP4, WebM, OGG, AVI, MOV (max 100MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default VideoUpload
