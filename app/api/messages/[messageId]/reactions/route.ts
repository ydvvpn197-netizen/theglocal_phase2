import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/messages/[messageId]/reactions - Add emoji reaction
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const logger = createAPILogger('POST', '/api/messages/[messageId]/reactions')
  try {
    const { messageId } = await params
    const body = await _request.json()
    const { emoji } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if message exists and user has access to it
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        conversations!messages_conversation_id_fkey(
          participant_1_id,
          participant_2_id
        )
      `
      )
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if user is a participant in the conversation
    interface ConversationData {
      participant_1_id: string
      participant_2_id: string
    }
    const conversation = (
      Array.isArray(message.conversations) ? message.conversations[0] : message.conversations
    ) as ConversationData | null
    const isParticipant =
      conversation &&
      (conversation.participant_1_id === user.id || conversation.participant_2_id === user.id)

    if (!isParticipant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if reaction already exists
    const { data: existingReaction, error: reactionError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (reactionError && reactionError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      logger.error(
        'Error checking existing reaction:',
        reactionError instanceof Error ? reactionError : undefined
      )
      throw reactionError
    }

    if (existingReaction) {
      return NextResponse.json({
        success: true,
        message: 'Reaction already exists',
      })
    }

    // Add reaction
    const { data: reaction, error: createError } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
        created_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        user:users!message_reactions_user_id_fkey(
          id,
          anonymous_handle
        )
      `
      )
      .single()

    if (createError) {
      logger.error(
        'Error creating reaction:',
        createError instanceof Error ? createError : undefined
      )
      throw createError
    }

    return createSuccessResponse(reaction, { message: 'Reaction added' })
  } catch (error) {
    const { messageId: errorMessageId } = await params
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/messages/${errorMessageId}/reactions`,
    })
  }
})
// DELETE /api/messages/[messageId]/reactions - Remove reaction
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const logger = createAPILogger('DELETE', '/api/messages/[messageId]/reactions')
  try {
    const { messageId } = await params
    const body = await _request.json()
    const { emoji } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if message exists and user has access to it
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        conversations!messages_conversation_id_fkey(
          participant_1_id,
          participant_2_id
        )
      `
      )
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if user is a participant in the conversation
    interface ConversationData {
      participant_1_id: string
      participant_2_id: string
    }
    const conversation = (
      Array.isArray(message.conversations) ? message.conversations[0] : message.conversations
    ) as ConversationData | null
    const isParticipant =
      conversation &&
      (conversation.participant_1_id === user.id || conversation.participant_2_id === user.id)

    if (!isParticipant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Remove reaction
    const { error: deleteError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)

    if (deleteError) {
      logger.error(
        'Error removing reaction:',
        deleteError instanceof Error ? deleteError : undefined
      )
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    })
  } catch (error) {
    const { messageId: errorMessageId } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/messages/${errorMessageId}/reactions`,
    })
  }
})
