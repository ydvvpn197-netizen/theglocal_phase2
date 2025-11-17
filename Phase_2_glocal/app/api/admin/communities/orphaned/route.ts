import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

interface OrphanedCommunity {
  community_id: string
  community_name: string
  community_slug: string
  creator_id: string
  created_at: string
}

/**
 * GET /api/admin/communities/orphaned
 * Admin endpoint to find orphaned communities (where creator is not a member)
 * Useful for monitoring and detecting issues with community creation
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/communities/orphaned')
  try {
    // Require admin authentication
    await requireAdminOrThrow()
    const adminClient = createAdminClient()

    // Call the database function to find orphaned communities
    const { data, error } = await adminClient.rpc('find_orphaned_communities')

    if (error) {
      logger.error(
        '[Admin] Error finding orphaned communities:',
        error instanceof Error ? error : undefined
      )
      throw error
    }

    const orphanedData = (data as OrphanedCommunity[]) || []

    // Log the results
    if (orphanedData.length > 0) {
      logger.warn('[Admin] Found orphaned communities:', {
        count: orphanedData.length,
        communities: orphanedData.map((c) => ({
          id: c.community_id,
          name: c.community_name,
          slug: c.community_slug,
          created_at: c.created_at,
        })),
      })
    } else {
      logger.info('[Admin] No orphaned communities found')
    }

    return NextResponse.json({
      success: true,
      data: orphanedData,
      count: orphanedData.length,
      message:
        orphanedData.length > 0
          ? `Found ${orphanedData.length} orphaned communities`
          : 'No orphaned communities found',
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/communities/orphaned' })
  }
})

/**
 * POST /api/admin/communities/orphaned/fix
 * Admin endpoint to automatically fix all orphaned communities
 * This adds creators as admins for all orphaned communities
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/admin/communities/orphaned')
  try {
    // Require admin authentication
    await requireAdminOrThrow()
    const adminClient = createAdminClient()

    // First, find all orphaned communities
    const { data: orphaned, error: findError } = await adminClient.rpc('find_orphaned_communities')

    if (findError) {
      logger.error(
        '[Admin] Error finding orphaned communities:',
        findError instanceof Error ? findError : undefined
      )
      throw findError
    }

    const orphanedCommunities = (orphaned as OrphanedCommunity[]) || []

    if (orphanedCommunities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned communities to fix',
        fixed: 0,
      })
    }

    logger.info(`[Admin] Attempting to fix ${orphanedCommunities.length} orphaned communities`)

    let fixed = 0
    const errors: Array<{ community_id: string; community_name: string; error: string }> = []

    // Fix each orphaned community
    for (const community of orphanedCommunities) {
      try {
        const { error: insertError } = await adminClient.from('community_members').insert({
          community_id: community.community_id,
          user_id: community.creator_id,
          role: 'admin',
          joined_at: new Date().toISOString(),
        })

        if (insertError) {
          if (insertError.code === '23505') {
            // Already exists - skip
            logger.info(`[Admin] Member already exists for community ${community.community_name}`)
            fixed++
          } else {
            throw insertError
          }
        } else {
          logger.info(
            `[Admin] Fixed orphaned community: ${community.community_name} (${community.community_id})`
          )
          fixed++
        }
      } catch (error) {
        logger.error(`[Admin] Error fixing community ${community.community_name}:`, error)
        errors.push({
          community_id: community.community_id,
          community_name: community.community_name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} out of ${orphanedCommunities.length} orphaned communities`,
      fixed,
      total: orphanedCommunities.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/admin/communities/orphaned',
    })
  }
})
