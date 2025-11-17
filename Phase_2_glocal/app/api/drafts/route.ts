import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

interface DraftPayload {
  id?: string
  type: 'post' | 'comment'
  title?: string
  body: string
  external_url?: string
  location_city?: string
  community_id?: string
  parent_id?: string
  post_id?: string
  content?: Record<string, unknown> // For media_items and other metadata
  user_id?: string
  [key: string]: unknown
}

// GET /api/drafts - Get user's drafts
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/drafts')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Cleanup expired drafts occasionally (1% chance to avoid performance impact)
    if (Math.random() < 0.01) {
      const { error: cleanupError } = await supabase.rpc('cleanup_expired_drafts')
      if (cleanupError) {
        logger.warn('Failed to cleanup expired drafts:', {
          error: cleanupError.message,
          code: cleanupError.code,
          details: cleanupError.details,
        })
      }
    }

    // Fetch drafts from database
    const { data: drafts, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch drafts:', error)
      throw error
    }

    // Transform database format to client format
    const transformedDrafts = (drafts || []).map((draft) => ({
      id: draft.id,
      type: draft.type,
      title: draft.title || undefined,
      body: draft.body || '',
      external_url: draft.external_url || undefined,
      location_city: draft.location_city || undefined,
      community_id: draft.community_id || undefined,
      parent_id: draft.parent_id || undefined,
      post_id: draft.post_id || undefined,
      media_items: (draft.content as { media_items?: unknown[] })?.media_items || [],
      created_at: draft.created_at,
      updated_at: draft.updated_at,
      last_saved_at: draft.last_saved_at,
      user_id: draft.user_id,
      auto_saved: true,
      is_synced: true,
    }))

    logger.info(`📖 Retrieved ${transformedDrafts.length} drafts for user ${user.id}`)

    return createSuccessResponse(transformedDrafts)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/drafts' })
  }
})

// POST /api/drafts - Save/update draft
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/drafts')
  try {
    const payload = (await _request.json()) as DraftPayload

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Validate draft data
    if (!payload.type) {
      return NextResponse.json({ error: 'Draft type is required' }, { status: 400 })
    }

    if (payload.body === undefined) {
      return NextResponse.json({ error: 'Draft body is required' }, { status: 400 })
    }

    // Prepare database payload
    const dbPayload: Record<string, unknown> = {
      user_id: user.id,
      type: payload.type,
      body: payload.body || '',
      title: payload.title || null,
      external_url: payload.external_url || null,
      location_city: payload.location_city || null,
      community_id: payload.community_id || null,
      parent_id: payload.parent_id || null,
      post_id: payload.post_id || null,
      content: {
        media_items: payload.content?.media_items || payload.media_items || [],
        ...(payload.content || {}),
      },
      last_saved_at: new Date().toISOString(),
    }

    let savedDraft

    if (payload.id) {
      // Update existing draft
      const { data, error } = await supabase
        .from('drafts')
        .update(dbPayload)
        .eq('id', payload.id)
        .eq('user_id', user.id) // Ensure user owns the draft
        .select()
        .single()

      if (error) {
        logger.error('Failed to update draft:', error)
        throw error
      }

      if (!data) {
        throw APIErrors.notFound('Draft')
      }

      savedDraft = data
    } else {
      // Create new draft
      const { data, error } = await supabase.from('drafts').insert(dbPayload).select().single()

      if (error) {
        logger.error('Failed to create draft:', error)
        throw error
      }

      savedDraft = data
    }

    // Transform to client format
    const transformedDraft = {
      id: savedDraft.id,
      type: savedDraft.type,
      title: savedDraft.title || undefined,
      body: savedDraft.body || '',
      external_url: savedDraft.external_url || undefined,
      location_city: savedDraft.location_city || undefined,
      community_id: savedDraft.community_id || undefined,
      parent_id: savedDraft.parent_id || undefined,
      post_id: savedDraft.post_id || undefined,
      media_items: (savedDraft.content as { media_items?: unknown[] })?.media_items || [],
      created_at: savedDraft.created_at,
      updated_at: savedDraft.updated_at,
      last_saved_at: savedDraft.last_saved_at,
      user_id: savedDraft.user_id,
      auto_saved: true,
      is_synced: true,
    }

    logger.info(`💾 Saved draft ${savedDraft.id} for user ${user.id}`)

    return createSuccessResponse(transformedDraft, { message: 'Draft saved successfully' })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/drafts' })
  }
})

// DELETE /api/drafts - Clear all user drafts
export const DELETE = withRateLimit(async function DELETE(_request: NextRequest) {
  const logger = createAPILogger('DELETE', '/api/drafts')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Delete all drafts for this user
    const { error, count } = await supabase
      .from('drafts')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete drafts:', error)
      throw error
    }

    const deletedCount = count || 0

    logger.info(`🗑️ Deleted ${deletedCount} drafts for user ${user.id}`)

    return createSuccessResponse(
      { deleted_count: deletedCount },
      { message: `Deleted ${deletedCount} drafts` }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'DELETE', path: '/api/drafts' })
  }
})
