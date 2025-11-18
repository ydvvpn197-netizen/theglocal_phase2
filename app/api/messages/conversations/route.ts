import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConversationsResponse } from '@/lib/types/messages.types'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/messages/conversations - List all user's conversations
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/messages/conversations')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(_request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Fetch conversations with participant info and last message
    const { data: conversations, error: conversationsError } = await supabase
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
        ),
        messages!messages_conversation_id_fkey(
          id,
          content,
          attachment_url,
          attachment_type,
          is_deleted,
          created_at,
          sender_id
        )
      `
      )
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (conversationsError) {
      logger.error('Error fetching conversations', conversationsError)
      throw conversationsError
    }

    // Process conversations to add unread count and last message
    const processedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // Get unread count for this conversation
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
          .is('is_deleted', false)
          .not('id', 'in', `(SELECT message_id FROM message_reads WHERE user_id = '${user.id}')`)

        // Get last message (not deleted)
        interface Message {
          is_deleted: boolean
          created_at: string
          [key: string]: unknown
        }
        const messages = conversation.messages as Message[] | null | undefined
        const lastMessage = messages
          ?.filter((msg) => !msg.is_deleted)
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        return {
          ...conversation,
          unread_count: unreadCount || 0,
          last_message: lastMessage || null,
          messages: undefined, // Remove messages array to avoid large payload
        }
      })
    )

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)

    const response: ConversationsResponse = {
      success: true,
      data: processedConversations,
      meta: {
        total: totalCount || 0,
        has_more: offset + limit < (totalCount || 0),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/messages/conversations' })
  }
})
// POST /api/messages/conversations - Create new conversation
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/messages/conversations')
  try {
    const body = await _request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, anonymous_handle')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use the database function to get or create conversation
    const { data: conversationId, error: conversationError } = await supabase.rpc(
      'get_or_create_conversation',
      {
        user1_id: user.id,
        user2_id: userId,
      }
    )

    if (conversationError) {
      logger.error('Error creating conversation', conversationError)
      // Provide more specific error message
      if (conversationError.message?.includes('duplicate') || conversationError.code === '23505') {
        // Conversation already exists, fetch it
        const { data: existingConversations } = await supabase
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
          .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
          .limit(1)
          .single()

        if (existingConversations) {
          // Get unread count for existing conversation
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', existingConversations.id)
            .neq('sender_id', user.id)
            .is('is_deleted', false)
            .not('id', 'in', `(SELECT message_id FROM message_reads WHERE user_id = '${user.id}')`)

          const response: ConversationsResponse = {
            success: true,
            data: [
              {
                ...existingConversations,
                unread_count: unreadCount || 0,
                last_message: null,
              },
            ],
          }

          return NextResponse.json(response, { status: 200 })
        }
      }
      throw conversationError
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Fetch the created conversation with participant info in a single optimized query
    const { data: conversation, error: fetchError } = await supabase
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
      .eq('id', conversationId)
      .single()

    if (fetchError) {
      logger.error('Error fetching conversation', fetchError)
      throw fetchError
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found after creation' }, { status: 404 })
    }

    // Return optimized response with all necessary data
    const response: ConversationsResponse = {
      success: true,
      data: [
        {
          ...conversation,
          unread_count: 0, // New conversation has no unread messages
          last_message: null, // New conversation has no messages yet
        },
      ],
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/messages/conversations' })
  }
})
