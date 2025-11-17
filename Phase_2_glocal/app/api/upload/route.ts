import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateImageFile } from '@/lib/utils/validation'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/upload - Upload a file
 *
 * @param request - Next.js request with form data containing file
 * @returns Uploaded file URL and path
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload')

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      throw APIErrors.badRequest('No file provided')
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw APIErrors.badRequest(validation.error || 'Invalid file')
    }

    logger.info('Uploading file', {
      userId: user.id,
      fileName: file.name,
      folder,
    })

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`
    const filepath = `${folder}/${filename}`

    // Upload to Supabase Storage
    const { error } = await supabase.storage.from('theglocal-uploads').upload(filepath, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) throw error

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('theglocal-uploads').getPublicUrl(filepath)

    logger.info('File uploaded successfully', {
      userId: user.id,
      filepath,
    })

    return createSuccessResponse({
      url: publicUrl,
      path: filepath,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/upload',
    })
  }
})
