import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processMediaFile } from '@/lib/utils/media/server-processing'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Extended timeout for processing

// POST /api/upload/chunked/complete - Complete chunked upload and process file
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload/chunked/complete')
  let uploadId: string | undefined
  try {
    const body = await _request.json()
    uploadId = body.uploadId
    const { fileName, folder = 'media' } = body

    if (!uploadId || !fileName) {
      throw APIErrors.badRequest('Missing required fields: uploadId, fileName')
    }

    logger.info(`🏁 Completing chunked upload: ${uploadId}`)

    const supabase = await createClient()

    // Get current user and verify authorization
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }
    // List chunk objects from storage
    const basePath = `tmp-uploads/${uploadId!}`
    const { data: list, error: listError } = await supabase.storage
      .from('theglocal-uploads')
      .list(basePath, { limit: 10000 })

    if (listError) {
      throw listError
    }

    const files = (list || []).filter((f) => f && typeof f.name === 'string')
    if (!files.length) {
      throw APIErrors.badRequest('No chunks found for upload')
    }

    // Sort by chunk index (zero-padded names)
    files.sort((a, b) => a.name.localeCompare(b.name))

    logger.info(`📋 Reassembling ${files.length} chunks for ${fileName}`)

    // Download and concatenate
    const buffers: Buffer[] = []
    for (const f of files) {
      const { data, error } = await supabase.storage
        .from('theglocal-uploads')
        .download(`${basePath}/${f.name}`)
      if (error || !data) {
        throw error || new Error(`Failed to download chunk ${f.name}`)
      }
      const arrayBuffer = await data.arrayBuffer()
      buffers.push(Buffer.from(arrayBuffer))
    }

    const completeBuffer = Buffer.concat(buffers)

    // Create File object for processing
    // MimeType will be determined by processMediaFile
    const completeFile = new File([completeBuffer], fileName)

    logger.info(`🔄 Processing reassembled file: ${fileName} (${completeBuffer.length} bytes)`)

    // Process the complete file using server-side processing
    const result = await processMediaFile(completeFile, folder)

    logger.info(`✅ File processing complete: ${result.id}`)

    // Cleanup temp chunks
    const removePaths = files.map((f) => `${basePath}/${f.name}`)
    await supabase.storage.from('theglocal-uploads').remove(removePaths)
    // Also attempt to remove the directory marker (safe to ignore)
    await supabase.storage.from('theglocal-uploads').remove([basePath])
    logger.info(`🧹 Cleaned up temp chunks for: ${uploadId}`)

    return createSuccessResponse({
      id: result.id,
      url: result.url,
      variants: result.variants,
      mediaType: result.mediaType,
      duration: result.duration,
      thumbnailUrl: result.thumbnailUrl,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      altText: result.altText,
    })
  } catch (error) {
    // Cleanup temp chunks on error if we have uploadId
    if (uploadId) {
      try {
        const supabase = await createClient()
        const basePath = `tmp-uploads/${uploadId}`
        const { data: list } = await supabase.storage
          .from('theglocal-uploads')
          .list(basePath, { limit: 10000 })
        if (list && list.length > 0) {
          const removePaths = list.map((f) => `${basePath}/${f.name}`)
          await supabase.storage.from('theglocal-uploads').remove(removePaths)
          await supabase.storage.from('theglocal-uploads').remove([basePath])
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    return handleAPIError(error, { method: 'POST', path: '/api/upload/chunked/complete' })
  }
})
