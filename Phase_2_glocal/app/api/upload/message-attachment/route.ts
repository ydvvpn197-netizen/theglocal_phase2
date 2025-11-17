import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAttachment, getAttachmentType } from '@/lib/utils/message-helpers'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/upload/message-attachment - Upload file for message attachment
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload/message-attachment')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await _request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validation = validateAttachment(file)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const filePath = `message-attachments/${fileName}`

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('theglocal-uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logger.error('Error uploading file:', uploadError instanceof Error ? uploadError : undefined)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('theglocal-uploads').getPublicUrl(filePath)

    const attachmentType = getAttachmentType(file)

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        type: attachmentType,
        filename: file.name,
        size: file.size,
        mime_type: file.type,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/upload/message-attachment' })
  }
})
