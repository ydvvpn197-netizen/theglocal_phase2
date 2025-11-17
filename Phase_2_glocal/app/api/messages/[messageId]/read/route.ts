import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/messages/[messageId]/read - Mark message as read
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const logger = createAPILogger('POST', '/api/messages/[messageId]/read')
  try {
    const { messageId } = await params
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
    // Supabase relationship queries return arrays, even with .single()
    const conversationsArray = message.conversations as ConversationData[] | null | undefined
    const conversation =
      Array.isArray(conversationsArray) && conversationsArray.length > 0
        ? conversationsArray[0]
        : null

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isParticipant =
      conversation.participant_1_id === user.id || conversation.participant_2_id === user.id

    if (!isParticipant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if already marked as read
    const { data: existingRead, error: readError } = await supabase
      .from('message_reads')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .single()

    if (readError && readError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      logger.error(
        'Error checking existing read:',
        readError instanceof Error ? readError : undefined
      )
      throw readError
    }

    if (existingRead) {
      return NextResponse.json({
        success: true,
        message: 'Message already marked as read',
      })
    }

    // Mark message as read
    const { data: readRecord, error: createError } = await supabase
      .from('message_reads')
      .insert({
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      logger.error(
        'Error creating read record:',
        createError instanceof Error ? createError : undefined
      )
      throw createError
    }

    return createSuccessResponse(readRecord, { message: 'Message marked as read' })
  } catch (error) {
    const { messageId: errorMessageId } = await params
    return handleAPIError(error, { method: 'POST', path: `/api/messages/${errorMessageId}/read` })
  }
})
