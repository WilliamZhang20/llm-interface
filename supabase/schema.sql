-- Run this in your Supabase SQL editor after enabling auth.

-- Provider keys: one row per user per provider, API key encrypted at rest
CREATE TABLE IF NOT EXISTS provider_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'grok')),
  enc_key     TEXT NOT NULL,
  priority    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages: normalized format, summaries are role='summary'
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'summary')),
  content         TEXT NOT NULL,
  model_used      TEXT,
  sequence_num    INT NOT NULL,
  is_summary      BOOLEAN NOT NULL DEFAULT false,
  summary_range   INT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_seq ON messages(conversation_id, sequence_num);
CREATE INDEX IF NOT EXISTS conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Row Level Security
ALTER TABLE provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_keys: own rows only" ON provider_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "conversations: own rows only" ON conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "messages: own conversations only" ON messages
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM conversations WHERE id = conversation_id)
  );
