import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  handleAPIError,
  createSuccessResponse,
  APIErrors,
  APIError,
} from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// This endpoint only handles video upload initiation and signed URL generation
// The actual upload happens directly from the client to Supabase Storage
export const runtime = 'nodejs'
export const maxDuration = 30

export const POST = withRateLimit(async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    const body = await _request.json()
    const { fileName, fileSize, fileType, folder = 'videos' } = body

    if (!fileName || !fileSize || !fileType) {
      throw APIErrors.badRequest('Missing required fields: fileName, fileSize, fileType')
    }

    // Validate file type
    const allowedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/quicktime',
    ]

    if (!allowedVideoTypes.includes(fileType)) {
      throw APIErrors.badRequest('Invalid video file type. Allowed types: MP4, WebM, OGG, AVI, MOV')
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (fileSize > maxSize) {
      throw new APIError('File too large. Maximum size is 100MB for videos.', 413, 'FILE_TOO_LARGE')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileExtension = fileName.split('.').pop() || 'mp4'
    const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`
    const filePath = `${folder}/${uniqueFileName}`

    // Generate signed URL for direct upload to Supabase Storage
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('theglocal-videos')
      .createSignedUploadUrl(filePath, {
        upsert: false,
      })

    if (signedUrlError) {
      throw signedUrlError
    }

    // Return the signed URL and file path for client-side upload
    return createSuccessResponse({
      signedUrl: signedUrlData.signedUrl,
      path: filePath,
      token: signedUrlData.token,
      fileName: uniqueFileName,
      originalFileName: fileName,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/upload/video' })
  }
})
