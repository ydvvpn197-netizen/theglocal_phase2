-- ============================================
-- MESSAGING SYSTEM MIGRATION
-- Version: 0079
-- Description: Real-time user-to-user messaging system
-- Date: 2025-01-27
-- ============================================

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure participant_1_id < participant_2_id for consistent ordering
  CONSTRAINT participant_order CHECK (participant_1_id < participant_2_id),
  -- Unique constraint on participant pairs (bidirectional)
  CONSTRAINT unique_participants UNIQUE (participant_1_id, participant_2_id)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT, -- 'image', 'file', etc.
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MESSAGE READS TABLE
-- ============================================
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on (message_id, user_id)
  CONSTRAINT unique_message_user_read UNIQUE (message_id, user_id)
);

-- ============================================
-- MESSAGE REACTIONS TABLE
-- ============================================
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on (message_id, user_id, emoji)
  CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

-- ============================================
-- USER PRESENCE TABLE
-- ============================================
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Conversations indexes
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Message reads indexes
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);
CREATE INDEX idx_message_reads_message_user ON message_reads(message_id, user_id);

-- Message reactions indexes
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON message_reactions(user_id);

-- User presence indexes
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CONVERSATIONS RLS POLICIES
-- ============================================

-- Users can only see conversations they're part of
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (
    participant_1_id = auth.uid() OR 
    participant_2_id = auth.uid()
  );

-- Users can create conversations with other users
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    (participant_1_id = auth.uid() OR participant_2_id = auth.uid()) AND
    participant_1_id != participant_2_id
  );

-- Users can update their own conversations (for last_message_at)
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    participant_1_id = auth.uid() OR 
    participant_2_id = auth.uid()
  );

-- ============================================
-- MESSAGES RLS POLICIES
-- ============================================

-- Users can only see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- Users can edit their own messages (within time limit)
CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid() AND
    created_at > NOW() - INTERVAL '10 minutes'
  );

-- Users can delete their own messages (soft delete)
CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid()
  );

-- ============================================
-- MESSAGE READS RLS POLICIES
-- ============================================

-- Users can insert their own read records
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages 
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = message_reads.message_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- Users can view all read records in their conversations
CREATE POLICY "Users can view read records in their conversations"
  ON message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages 
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = message_reads.message_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- ============================================
-- MESSAGE REACTIONS RLS POLICIES
-- ============================================

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to messages"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages 
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = message_reactions.message_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- Users can view all reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages 
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = message_reactions.message_id 
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

-- ============================================
-- USER PRESENCE RLS POLICIES
-- ============================================

-- Anyone can read presence status (for online indicators)
CREATE POLICY "Anyone can view presence status"
  ON user_presence FOR SELECT
  USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can update their own presence"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- Users can insert their own presence record
CREATE POLICY "Users can create their own presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS FOR CONVERSATION MANAGEMENT
-- ============================================

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id UUID,
  user2_id UUID
) RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Ensure consistent ordering
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM conversations
  WHERE participant_1_id = smaller_id AND participant_2_id = larger_id;

  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (participant_1_id, participant_2_id)
    VALUES (smaller_id, larger_id)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at when new message is inserted
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for all messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
