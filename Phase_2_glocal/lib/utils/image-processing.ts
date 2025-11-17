/**
 * Image processing utilities for client-side image manipulation
 * Handles cropping, rotation, resizing, and compression
 */

import { Area } from 'react-easy-crop'
import { compressImage } from './image-optimization'
import { logger } from './logger'

export interface CropArea extends Area {
  x: number
  y: number
  width: number
  height: number
}

export interface ProcessImageOptions {
  crop?: CropArea
  imageSize?: { width: number; height: number }
  rotation?: number
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio?: boolean
  quality?: number
}

/**
 * Create an image element from a file
 */
function createImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }

    img.src = url
  })
}

/**
 * Convert canvas to File
 */
function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType: string = 'image/jpeg',
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'))
          return
        }
        const file = new File([blob], fileName, { type: mimeType })
        resolve(file)
      },
      mimeType,
      quality
    )
  })
}

/**
 * Crop an image based on crop area
 * cropArea coordinates are relative to the displayed image size
 * imageSize is the displayed size in the crop component
 */
export async function cropImage(
  imageFile: File,
  cropArea: CropArea,
  imageSize: { width: number; height: number },
  rotation: number = 0
): Promise<File> {
  try {
    const img = await createImageElement(imageFile)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Calculate scale factor between displayed image and actual image
    const scaleX = img.width / imageSize.width
    const scaleY = img.height / imageSize.height

    // Convert crop area from displayed coordinates to actual image coordinates
    const actualCropArea = {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY,
    }

    // Handle rotation
    if (rotation !== 0) {
      const rad = (rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(rad))
      const cos = Math.abs(Math.cos(rad))

      // Calculate rotated image dimensions
      const rotatedWidth = img.width * cos + img.height * sin
      const rotatedHeight = img.width * sin + img.height * cos

      // Create a canvas for the rotated image
      const rotatedCanvas = document.createElement('canvas')
      rotatedCanvas.width = rotatedWidth
      rotatedCanvas.height = rotatedHeight
      const rotatedCtx = rotatedCanvas.getContext('2d')

      if (!rotatedCtx) {
        throw new Error('Failed to get rotated canvas context')
      }

      // Rotate and draw the image
      rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2)
      rotatedCtx.rotate(rad)
      rotatedCtx.drawImage(img, -img.width / 2, -img.height / 2)

      // Now crop from the rotated image
      // Adjust crop coordinates for rotation
      const rotationOffsetX = (rotatedWidth - img.width) / 2
      const rotationOffsetY = (rotatedHeight - img.height) / 2

      canvas.width = actualCropArea.width
      canvas.height = actualCropArea.height

      ctx.drawImage(
        rotatedCanvas,
        actualCropArea.x + rotationOffsetX,
        actualCropArea.y + rotationOffsetY,
        actualCropArea.width,
        actualCropArea.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
    } else {
      // No rotation, simple crop
      canvas.width = actualCropArea.width
      canvas.height = actualCropArea.height

      ctx.drawImage(
        img,
        actualCropArea.x,
        actualCropArea.y,
        actualCropArea.width,
        actualCropArea.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
    }

    // Convert to file
    const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '_cropped.jpg'
    return await canvasToFile(canvas, fileName, 'image/jpeg', 0.9)
  } catch (error) {
    logger.error('Image cropping failed:', error)
    throw error
  }
}

/**
 * Rotate an image by specified degrees
 */
export async function rotateImage(imageFile: File, degrees: number): Promise<File> {
  try {
    const img = await createImageElement(imageFile)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Calculate canvas size for rotation
    const rad = (degrees * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))

    canvas.width = img.width * cos + img.height * sin
    canvas.height = img.width * sin + img.height * cos

    // Rotate and draw
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rad)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)

    // Convert to file
    const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '_rotated.jpg'
    return await canvasToFile(canvas, fileName, 'image/jpeg', 0.9)
  } catch (error) {
    logger.error('Image rotation failed:', error)
    throw error
  }
}

/**
 * Resize an image while maintaining aspect ratio
 */
export async function resizeImage(
  imageFile: File,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean = true
): Promise<File> {
  try {
    const img = await createImageElement(imageFile)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    let width = img.width
    let height = img.height

    if (maintainAspectRatio) {
      // Calculate new dimensions maintaining aspect ratio
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      if (ratio < 1) {
        width = width * ratio
        height = height * ratio
      }
    } else {
      width = Math.min(width, maxWidth)
      height = Math.min(height, maxHeight)
    }

    canvas.width = width
    canvas.height = height

    // Use high-quality image rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(img, 0, 0, width, height)

    // Convert to file
    const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '_resized.jpg'
    return await canvasToFile(canvas, fileName, 'image/jpeg', 0.9)
  } catch (error) {
    logger.error('Image resizing failed:', error)
    throw error
  }
}

/**
 * Process image through complete pipeline: crop → rotate → resize → compress
 */
export async function processImage(
  imageFile: File,
  options: ProcessImageOptions = {}
): Promise<File> {
  try {
    let processedFile = imageFile

    // Step 1: Crop and/or rotate (if crop area provided)
    if (options.crop && options.imageSize) {
      processedFile = await cropImage(
        processedFile,
        options.crop,
        options.imageSize,
        options.rotation || 0
      )
    } else if (options.rotation && options.rotation !== 0) {
      // If no crop but rotation, just rotate
      processedFile = await rotateImage(processedFile, options.rotation)
    }

    // Step 2: Resize (if max dimensions provided)
    if (options.maxWidth || options.maxHeight) {
      processedFile = await resizeImage(
        processedFile,
        options.maxWidth || 1920,
        options.maxHeight || 1920,
        options.maintainAspectRatio !== false
      )
    }

    // Step 3: Compress
    const compressionOptions = {
      maxSizeMB: 2,
      maxWidthOrHeight: options.maxWidth || 1920,
      quality: options.quality || 0.8,
    }

    processedFile = await compressImage(processedFile, compressionOptions)

    return processedFile
  } catch (error) {
    logger.error('Image processing failed:', error)
    // Return original file if processing fails
    return imageFile
  }
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{
  width: number
  height: number
}> {
  const img = await createImageElement(file)
  return {
    width: img.width,
    height: img.height,
  }
}
