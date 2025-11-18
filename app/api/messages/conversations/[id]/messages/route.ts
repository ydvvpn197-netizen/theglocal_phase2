import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MessagesResponse, MessageResponse } from '@/lib/types/messages.types'
import { validateMessageContent } from '@/lib/utils/message-helpers'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/messages/conversations/[id]/messages - Get messages for conversation
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/messages/conversations/[id]/messages')
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

    // Get query parameters
    const { searchParams } = new URL(_request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Check if user is a participant in this conversation
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

    // Fetch messages with sender info, reads, and reactions
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(
          id,
          anonymous_handle,
          avatar_seed
        ),
        reads:message_reads(
          id,
          user_id,
          read_at,
          user:users!message_reads_user_id_fkey(
            id,
            anonymous_handle
          )
        ),
        reactions:message_reactions(
          id,
          user_id,
          emoji,
          created_at,
          user:users!message_reactions_user_id_fkey(
            id,
            anonymous_handle
          )
        )
      `
      )
      .eq('conversation_id', id)
      .is('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      logger.error(
        'Error fetching messages:',
        messagesError instanceof Error ? messagesError : undefined
      )
      throw messagesError
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', id)
      .is('is_deleted', false)

    const response: MessagesResponse = {
      success: true,
      data: messages || [],
      meta: {
        total: totalCount || 0,
        has_more: offset + limit < (totalCount || 0),
        conversation_id: id,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/messages/conversations/${errorId}/messages`,
    })
  }
})

// POST /api/messages/conversations/[id]/messages - Send new message
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('POST', '/api/messages/conversations/[id]/messages')
  try {
    const { id } = await params
    const body = await _request.json()
    const { content, attachment_url, attachment_type } = body

    // Validate message content
    const validation = validateMessageContent(content)
    if (!validation.isValid) {
      throw APIErrors.badRequest(validation.error || 'Invalid message content')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Check if user is a participant in this conversation
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

    // Create message
    const { data: newMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content: content.trim(),
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
      })
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(
          id,
          anonymous_handle,
          avatar_seed
        ),
        reads:message_reads(
          id,
          user_id,
          read_at,
          user:users!message_reads_user_id_fkey(
            id,
            anonymous_handle
          )
        ),
        reactions:message_reactions(
          id,
          user_id,
          emoji,
          created_at,
          user:users!message_reactions_user_id_fkey(
            id,
            anonymous_handle
          )
        )
      `
      )
      .single()

    if (createError) {
      logger.error(
        'Error creating message:',
        createError instanceof Error ? createError : undefined
      )
      throw createError
    }

    // Note: Notification is created by database trigger (notify_direct_message)
    // The trigger will create a notification for the recipient automatically

    logger.info('Message created successfully', {
      messageId: newMessage.id,
      conversationId: id,
      senderId: user.id,
      contentLength: newMessage.content?.length || 0,
    })

    const response: MessageResponse = {
      success: true,
      data: newMessage,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/messages/conversations/${errorId}/messages`,
    })
  }
})
