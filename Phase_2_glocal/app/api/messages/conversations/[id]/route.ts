import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConversationsResponse } from '@/lib/types/messages.types'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/messages/conversations/[id] - Get conversation details
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/messages/conversations/[id]')
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Fetch conversation with participant info
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        participant_1:users!conversations_participant_1_id_fkey(
          id,
          anonymous_handle,
          avatar_seed,
          location_city
        ),
        participant_2:users!conversations_participant_2_id_fkey(
          id,
          anonymous_handle,
          avatar_seed,
          location_city
        )
      `
      )
      .eq('id', id)
      .single()

    if (conversationError || !conversation) {
      throw APIErrors.notFound('Conversation')
    }

    // Check if user is a participant
    const isParticipant =
      conversation.participant_1_id === user.id || conversation.participant_2_id === user.id
    if (!isParticipant) {
      throw APIErrors.forbidden()
    }

    // Get unread count for this conversation
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
      .is('is_deleted', false)
      .not('id', 'in', `(SELECT message_id FROM message_reads WHERE user_id = '${user.id}')`)

    const response: ConversationsResponse = {
      success: true,
      data: [
        {
          ...conversation,
          unread_count: unreadCount || 0,
          last_message: null,
        },
      ],
    }

    return NextResponse.json(response)
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/messages/conversations/${errorId}`,
    })
  }
})

// DELETE /api/messages/conversations/[id] - Archive/leave conversation
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('DELETE', '/api/messages/conversations/[id]')
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Check if user is a participant
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', id)
      .single()

    if (conversationError || !conversation) {
      throw APIErrors.notFound('Conversation')
    }

    const isParticipant =
      conversation.participant_1_id === user.id || conversation.participant_2_id === user.id
    if (!isParticipant) {
      throw APIErrors.forbidden()
    }

    // For now, we'll just delete the conversation
    // In a more sophisticated implementation, you might want to:
    // - Soft delete for one participant
    // - Only delete if both participants want to leave
    // - Archive instead of delete
    const { error: deleteError } = await supabase.from('conversations').delete().eq('id', id)

    if (deleteError) {
      logger.error(
        'Error deleting conversation:',
        deleteError instanceof Error ? deleteError : undefined
      )
      throw deleteError
    }

    return createSuccessResponse(null, {
      message: 'Conversation deleted successfully',
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/messages/conversations/${errorId}`,
    })
  }
})
