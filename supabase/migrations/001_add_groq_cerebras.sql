-- Adds 'groq' and 'cerebras' to the allowed providers.
-- Run this once in the Supabase SQL editor on an existing database.
-- (Fresh installs already get these via supabase/schema.sql.)

ALTER TABLE provider_keys
  DROP CONSTRAINT IF EXISTS provider_keys_provider_check;

ALTER TABLE provider_keys
  ADD CONSTRAINT provider_keys_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'grok', 'groq', 'cerebras'));
