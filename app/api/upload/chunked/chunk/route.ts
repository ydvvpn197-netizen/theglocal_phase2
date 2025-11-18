import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/upload/chunked/chunk - Upload individual chunk
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload/chunked/chunk')
  try {
    const formData = await _request.formData()

    // Enhanced validation for FormData fields
    const uploadId = formData.get('uploadId')
    const chunkIndexStr = formData.get('chunkIndex')
    const chunkFile = formData.get('chunk')
    const folder = (formData.get('folder') as string) || 'media'

    // Validate required fields with proper type checking
    if (!uploadId || typeof uploadId !== 'string' || uploadId.trim() === '') {
      return NextResponse.json({ error: 'Missing or invalid uploadId' }, { status: 400 })
    }

    if (!chunkIndexStr || typeof chunkIndexStr !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid chunkIndex' }, { status: 400 })
    }

    const chunkIndex = parseInt(chunkIndexStr.trim())
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid chunkIndex: must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!chunkFile || !(chunkFile instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid chunk file' }, { status: 400 })
    }

    // Additional chunk file validation
    if (chunkFile.size === 0) {
      return NextResponse.json({ error: 'Chunk file is empty' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user and verify authorization
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Persist chunk to Supabase Storage (durable)
    const chunkPath = `tmp-uploads/${uploadId}/${chunkIndex.toString().padStart(6, '0')}`
    const buffer = Buffer.from(await chunkFile.arrayBuffer())

    // Idempotency: try to remove existing chunk first (ignore errors)
    await supabase.storage.from('theglocal-uploads').remove([chunkPath])

    const { error: uploadError } = await supabase.storage
      .from('theglocal-uploads')
      .upload(chunkPath, buffer, {
        contentType: 'application/octet-stream',
        cacheControl: '60',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to store chunk: ${uploadError.message}` },
        { status: 500 }
      )
    }

    logger.info(`📦 Stored chunk ${chunkIndex} for ${uploadId} at ${chunkPath}`)

    return NextResponse.json({
      success: true,
      chunkIndex,
      uploadId,
      folder,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/upload/chunked/chunk' })
  }
})
