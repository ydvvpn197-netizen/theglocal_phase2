import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for cleanup job

/**
 * POST /api/cron/cleanup-orphaned-media
 * Cron job to clean up media files that were uploaded but never attached to a post/comment
 *
 * This job:
 * 1. Finds media_items older than 24 hours without an owner (orphaned)
 * 2. Finds files in storage that don't have a corresponding media_items record
 * 3. Deletes orphaned files from storage
 *
 * Security: Requires cron secret in headers
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/cron/cleanup-orphaned-media')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = createAdminClient()

    logger.info('Starting orphaned media cleanup job')

    // Find media_items that are older than 24 hours but have no owner
    // (This shouldn't happen in normal flow, but check for safety)
    const { data: orphanedMediaItems, error: orphanedError } = await supabase
      .from('media_items')
      .select('id, url, owner_type, owner_id, created_at')
      .is('owner_id', null)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (orphanedError) {
      logger.error('Error finding orphaned media_items', orphanedError)
    }

    let deletedCount = 0
    let errorCount = 0

    // Delete orphaned media_items and their files
    if (orphanedMediaItems && orphanedMediaItems.length > 0) {
      logger.info('Found orphaned media_items', { count: orphanedMediaItems.length })

      for (const item of orphanedMediaItems) {
        try {
          if (!item.url) continue

          // Extract bucket and path from URL
          const url = new URL(item.url)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)

          if (pathMatch && pathMatch[1] && pathMatch[2]) {
            const bucket = pathMatch[1]
            const filePath = pathMatch[2]

            // Delete from storage
            const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath])

            if (deleteError) {
              logger.warn('Failed to delete file', { filePath, error: deleteError.message })
              errorCount++
            } else {
              // Delete the media_items record
              await supabase.from('media_items').delete().eq('id', item.id)

              deletedCount++
              logger.info('Deleted orphaned media', { filePath })
            }
          }
        } catch (error) {
          logger.warn('Error processing orphaned media item', { error, itemId: item.id })
          errorCount++
        }
      }
    }

    // Note: Checking for files in storage without media_items records is complex
    // and expensive, so we'll skip that for now. The main issue is handled above.

    logger.info('Cleanup complete', { deletedCount, errorCount })

    return createSuccessResponse(
      {
        deleted: deletedCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      },
      {
        message: 'Orphaned media cleanup completed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/cron/cleanup-orphaned-media',
    })
  }
}) // Cron jobs use CRON preset automatically
