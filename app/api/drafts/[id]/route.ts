import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

interface DraftPayload {
  title?: string
  body?: string
  external_url?: string
  location_city?: string
  community_id?: string
  parent_id?: string
  post_id?: string
  content?: Record<string, unknown>
  [key: string]: unknown
}

// GET /api/drafts/[id] - Get specific draft
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/drafts/[id]')
  try {
    const { id: draftId } = await params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Fetch draft from database
    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id) // RLS ensures user can only access their own drafts
      .single()

    if (error || !draft) {
      throw APIErrors.notFound('Draft')
    }

    // Transform to client format
    const transformedDraft = {
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
    }

    return createSuccessResponse(transformedDraft)
  } catch (error) {
    const { id: errorDraftId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/drafts/${errorDraftId}`,
    })
  }
})

// PATCH /api/drafts/[id] - Update specific draft
export const PATCH = withRateLimit(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('PATCH', '/api/drafts/[id]')
  try {
    const { id: draftId } = await params
    const payload = (await request.json()) as DraftPayload

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
      last_saved_at: new Date().toISOString(),
    }

    if (payload.title !== undefined) updatePayload.title = payload.title || null
    if (payload.body !== undefined) updatePayload.body = payload.body || ''
    if (payload.external_url !== undefined)
      updatePayload.external_url = payload.external_url || null
    if (payload.location_city !== undefined)
      updatePayload.location_city = payload.location_city || null
    if (payload.community_id !== undefined)
      updatePayload.community_id = payload.community_id || null
    if (payload.parent_id !== undefined) updatePayload.parent_id = payload.parent_id || null
    if (payload.post_id !== undefined) updatePayload.post_id = payload.post_id || null
    if (payload.content !== undefined) {
      updatePayload.content = {
        media_items: payload.content.media_items || payload.media_items || [],
        ...(payload.content || {}),
      }
    }

    // Update draft
    const { data: draft, error } = await supabase
      .from('drafts')
      .update(updatePayload)
      .eq('id', draftId)
      .eq('user_id', user.id) // Ensure user owns the draft
      .select()
      .single()

    if (error || !draft) {
      if (error?.code === 'PGRST116') {
        throw APIErrors.notFound('Draft')
      }
      logger.error('Failed to update draft:', error)
      throw error
    }

    // Transform to client format
    const transformedDraft = {
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
    }

    logger.info(`💾 Updated draft ${draftId} for user ${user.id}`)

    return createSuccessResponse(transformedDraft, { message: 'Draft updated successfully' })
  } catch (error) {
    const { id: errorDraftId } = await params
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/drafts/${errorDraftId}`,
    })
  }
})

// DELETE /api/drafts/[id] - Delete specific draft
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('DELETE', '/api/drafts/[id]')
  try {
    const { id: draftId } = await params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Delete the draft (RLS ensures user can only delete their own drafts)
    const { error, count } = await supabase
      .from('drafts')
      .delete({ count: 'exact' })
      .eq('id', draftId)
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to delete draft:', error)
      throw error
    }

    if (count === 0) {
      throw APIErrors.notFound('Draft')
    }

    logger.info(`🗑️ Deleted draft ${draftId} for user ${user.id}`)

    return createSuccessResponse(null, {
      message: 'Draft deleted successfully',
    })
  } catch (error) {
    const { id: errorDraftId } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/drafts/${errorDraftId}`,
    })
  }
})
