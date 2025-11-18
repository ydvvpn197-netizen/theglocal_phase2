import { NextRequest, NextResponse } from 'next/server'
import { processMediaFiles } from '@/lib/utils/media/server-processing'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Route configuration for file uploads
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export interface MediaUploadResult {
  id: string
  url: string
  variants: Record<string, unknown>
  mediaType: 'image' | 'video' | 'gif'
  duration?: number
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  altText?: string
}

export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/upload/multiple')
  try {
    // Debug logging
    logger.info('=== Upload API Debug Info ===')
    logger.info('Content-Type', { value: _request.headers.get('content-type') })
    logger.info('Content-Length', { value: _request.headers.get('content-length') })
    logger.info('Request URL', { url: _request.url })
    logger.info('Request method', { method: _request.method })
    logger.info('All headers', { headers: Object.fromEntries(_request.headers.entries()) })

    // Try the standard approach first
    try {
      const parsedFormData = await _request.formData()
      logger.info('Successfully parsed FormData using _request.formData()')

      // Debug FormData contents
      logger.info('FormData entries')
      for (const [key, value] of parsedFormData.entries()) {
        logger.info(`FormData entry: ${key}`, {
          value: value instanceof File ? `File(${value.name}, ${value.size} bytes)` : String(value),
          type: typeof value,
          constructor: value?.constructor?.name,
        })
      }

      // Try multiple methods to get files
      let files: File[] = []

      // Method 1: getAll('files')
      const filesFromGetAll = parsedFormData.getAll('files').filter((value): value is File => {
        if (value instanceof File) return true
        if (typeof value === 'object' && value !== null) {
          const obj = value as { name?: unknown; size?: unknown }
          return 'name' in obj && 'size' in obj
        }
        return false
      })
      logger.info('getAll("files") result:', { count: filesFromGetAll.length, unit: 'files' })

      // Method 2: get('files') for single file
      const singleFileValue = parsedFormData.get('files')
      let singleFile: File | null = null
      if (singleFileValue instanceof File) {
        singleFile = singleFileValue
      } else if (typeof singleFileValue === 'object' && singleFileValue !== null) {
        const obj = singleFileValue as { name?: unknown; size?: unknown }
        if ('name' in obj && 'size' in obj) {
          singleFile = singleFileValue as File
        }
      }
      logger.info('get("files") result:', {
        result: singleFile ? `File(${singleFile.name})` : 'null',
      })

      // Method 3: Iterate through all entries to find files
      const allFiles: File[] = []
      for (const [key, value] of parsedFormData.entries()) {
        logger.info(`Checking key "${key}":`, {
          isFile: value instanceof File,
          type: typeof value,
          constructor: value?.constructor?.name,
          hasName: typeof value === 'object' && value !== null && 'name' in value,
          hasSize: typeof value === 'object' && value !== null && 'size' in value,
          value: value,
        })

        // Check if it's a File object or has File-like properties
        if (value instanceof File) {
          allFiles.push(value)
          logger.info(`Found file in key "${key}":`, {
            name: value.name,
            size: value.size,
            unit: 'bytes',
          })
        }
      }
      logger.info('All files found', { count: allFiles.length })

      // Use the method that found files
      if (filesFromGetAll.length > 0) {
        files = filesFromGetAll
        logger.info('Using getAll("files") method')
      } else if (singleFile) {
        files = [singleFile]
        logger.info('Using get("files") method')
      } else if (allFiles.length > 0) {
        files = allFiles
        logger.info('Using iteration method')
      }

      const folder = (parsedFormData.get('folder') as string) || 'media'
      logger.info('Folder', { folder })
      logger.info('Final files array length', { count: files.length })

      if (!files || files.length === 0) {
        logger.info('ERROR: No files found in FormData')
        return NextResponse.json({ error: 'No files provided' }, { status: 400 })
      }

      // Continue with the rest of the function using the parsed FormData
      return await processFiles(files, folder, parsedFormData)
    } catch (error) {
      return handleAPIError(error, { method: 'POST', path: '/api/upload/multiple' })
    }
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/upload/multiple',
    })
  }
})

async function processFiles(files: File[], folder: string, _formData: FormData) {
  const logger = createAPILogger('POST', '/api/upload/multiple')
  try {
    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 files allowed' }, { status: 400 })
    }

    logger.info(`Server-side processing: ${files.length} files`, {
      count: files.length,
      files: files.map((f) => `${f.name} (${f.size} bytes, ${f.type})`),
    })

    // Use new server-side media processing
    const { results, errors } = await processMediaFiles(files, folder)

    logger.info('Processing complete', {
      successful: results.length,
      failed: errors.length,
    })

    // Check if any files were successfully processed
    if (results.length === 0) {
      return NextResponse.json(
        {
          error: 'All file uploads failed',
          details: errors.map((e) => `${e.fileName}: ${e.error}`),
        },
        { status: 400 }
      )
    }

    // Convert to expected format for compatibility
    const compatibleResults: MediaUploadResult[] = results.map((result) => ({
      id: result.id,
      url: result.url,
      variants: result.variants as Record<string, unknown>,
      mediaType: result.mediaType,
      duration: result.duration,
      thumbnailUrl: result.thumbnailUrl,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      altText: result.altText,
    }))

    // Return results with any errors that occurred
    const response: {
      success: boolean
      data: MediaUploadResult[]
      errors?: Array<{ fileName: string; error: string }>
      message?: string
      warnings?: string[]
    } = {
      success: true,
      data: compatibleResults,
      message: `Successfully processed ${results.length} of ${files.length} files with server-side optimization`,
    }

    if (errors.length > 0) {
      response.warnings = errors.map((e) => `${e.fileName}: ${e.error}`)
      response.message += ` (${errors.length} files failed)`
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/upload/multiple',
    })
  }
}
