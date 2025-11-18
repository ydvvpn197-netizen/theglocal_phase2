-- Optimize Message Realtime Performance
-- Description: Add indexes to improve realtime query performance for messages
--              These indexes help with filtering and sorting in realtime subscriptions

-- Index for filtering messages by conversation_id (used in realtime subscriptions)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC)
WHERE is_deleted = false;

-- Index for message_reads lookups (used when marking messages as read)
CREATE INDEX IF NOT EXISTS idx_message_reads_user_message 
ON message_reads(user_id, message_id);

-- Index for checking unread messages in conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_unread
ON messages(conversation_id, sender_id, created_at DESC)
WHERE is_deleted = false;

-- Index for notifications realtime filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

-- Index for conversations realtime updates
CREATE INDEX IF NOT EXISTS idx_conversations_participants_updated
ON conversations(participant_1_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_participant2_updated
ON conversations(participant_2_id, last_message_at DESC NULLS LAST);

COMMENT ON INDEX idx_messages_conversation_created IS 'Optimizes realtime message filtering by conversation';
COMMENT ON INDEX idx_message_reads_user_message IS 'Speeds up read status checks';
COMMENT ON INDEX idx_messages_conversation_sender_unread IS 'Optimizes unread message queries';
COMMENT ON INDEX idx_notifications_user_created IS 'Optimizes notification realtime queries';
COMMENT ON INDEX idx_conversations_participants_updated IS 'Optimizes conversation list queries';

