import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// No in-memory sessions; durability handled via Storage in chunk route

// POST /api/upload/chunked/init - Initialize chunked upload session
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload/chunked/init')
  try {
    const body = await _request.json()
    const { uploadId, fileName, fileSize, mimeType, totalChunks, chunkSize } = body

    // Validate required fields
    if (!uploadId || !fileName || !fileSize || !mimeType || !totalChunks || !chunkSize) {
      throw APIErrors.badRequest(
        'Missing required fields: uploadId, fileName, fileSize, mimeType, totalChunks, chunkSize'
      )
    }

    // Validate file size limits
    const maxSize = mimeType.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024 // 100MB for video, 10MB for others
    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${mimeType.startsWith('video/') ? '100MB' : '10MB'}`,
        },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/', 'video/']
    if (!allowedTypes.some((type) => mimeType.startsWith(type))) {
      throw APIErrors.badRequest('Unsupported file type. Only images and videos are allowed.')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Return a lightweight OK; storage-based durability used for chunks
    logger.info(
      `📤 Init acknowledged: ${uploadId} (${fileName}, ${fileSize} bytes, ${totalChunks} chunks)`
    )

    return NextResponse.json({
      success: true,
      data: {
        uploadId,
        sessionCreated: true,
        totalChunks,
        chunkSize,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/upload/chunked/init' })
  }
})
// GET /api/upload/chunked/init/[uploadId] - Get upload session status
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const url = new URL(_request.url)
    const uploadId = url.pathname.split('/').pop()

    if (!uploadId) {
      throw APIErrors.badRequest('Upload ID is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.forbidden()
    }

    // Provide best-effort status by listing stored chunks
    const basePath = `tmp-uploads/${uploadId}`
    const { data: list, error } = await supabase.storage.from('theglocal-uploads').list(basePath)
    if (error) {
      throw APIErrors.internalError()
    }
    const uploadedChunks = (list || [])
      .map((f) => parseInt(f.name, 10))
      .filter((n) => !Number.isNaN(n))
    uploadedChunks.sort((a, b) => a - b)

    return NextResponse.json({
      success: true,
      data: {
        uploadId,
        uploadedChunks,
        fileName: null,
        fileSize: null,
        totalChunks: null,
        progress: null,
        createdAt: null,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/upload/chunked/init' })
  }
})
