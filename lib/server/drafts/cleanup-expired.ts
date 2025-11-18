/**
 * Server-side function to cleanup expired drafts
 * Deletes drafts older than 7 days
 * Can be called via cron job or scheduled function
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface CleanupResult {
  deletedCount: number
  success: boolean
  error?: string
}

/**
 * Cleanup expired drafts (older than 7 days)
 * Uses the database function for efficient deletion
 */
export async function cleanupExpiredDrafts(): Promise<CleanupResult> {
  try {
    const supabase = await createClient()

    // Call the database function to cleanup expired drafts
    const { data, error } = await supabase.rpc('cleanup_expired_drafts')

    if (error) {
      logger.error('Failed to cleanup expired drafts:', error)
      return {
        deletedCount: 0,
        success: false,
        error: error.message,
      }
    }

    const deletedCount = typeof data === 'number' ? data : 0

    logger.info(`🧹 Cleaned up ${deletedCount} expired drafts`)

    return {
      deletedCount,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error cleaning up expired drafts:', error)
    return {
      deletedCount: 0,
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * API route handler for manual cleanup (admin only)
 * Can be called via: POST /api/admin/cleanup-drafts
 */
export async function handleCleanupRequest(): Promise<Response> {
  try {
    const result = await cleanupExpiredDrafts()

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: result.error || 'Failed to cleanup expired drafts',
        },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Cleaned up ${result.deletedCount} expired drafts`,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
