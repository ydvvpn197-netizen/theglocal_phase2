import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MessageResponse } from '@/lib/types/messages.types'
import { validateMessageContent } from '@/lib/utils/message-helpers'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// PATCH /api/messages/[messageId] - Edit message
export const PATCH = withRateLimit(async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const logger = createAPILogger('PATCH', '/api/messages/[messageId]')
  try {
    const { messageId } = await params
    const body = await _request.json()
    const { content } = body

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

    // Get the message to check ownership and editability
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      throw APIErrors.notFound('Message')
    }

    // Check if user is the sender
    if (message.sender_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if message is deleted
    if (message.is_deleted) {
      throw APIErrors.badRequest('Cannot edit deleted message')
    }

    // Check if message is within edit window (10 minutes)
    const messageTime = new Date(message.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      throw APIErrors.badRequest('Message can only be edited within 10 minutes')
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
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

    if (updateError) {
      logger.error(
        'Error updating message:',
        updateError instanceof Error ? updateError : undefined
      )
      throw updateError
    }

    const response: MessageResponse = {
      success: true,
      data: updatedMessage,
    }

    return NextResponse.json(response)
  } catch (error) {
    const { messageId: errorMessageId } = await params
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/messages/${errorMessageId}`,
    })
  }
})

// DELETE /api/messages/[messageId] - Soft delete message
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const logger = createAPILogger('DELETE', '/api/messages/[messageId]')
  try {
    const { messageId } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get the message to check ownership
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      throw APIErrors.notFound('Message')
    }

    // Check if user is the sender
    if (message.sender_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if already deleted
    if (message.is_deleted) {
      throw APIErrors.badRequest('Message already deleted')
    }

    // Soft delete the message
    const { data: deletedMessage, error: deleteError } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
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

    if (deleteError) {
      logger.error(
        'Error deleting message:',
        deleteError instanceof Error ? deleteError : undefined
      )
      throw deleteError
    }

    const response: MessageResponse = {
      success: true,
      data: deletedMessage,
    }

    return NextResponse.json(response)
  } catch (error) {
    const { messageId: errorMessageId } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/messages/${errorMessageId}`,
    })
  }
})
