-- =============================================================================
-- ContractIQ — Production Database Schema
-- =============================================================================
--
-- Paste this entire file into the Supabase SQL Editor and run it on a fresh
-- project. Every statement is idempotent: safe to re-run without side-effects.
--
-- Execution order
--   1.  Extensions
--   2.  Tables
--   3.  Indexes
--   4.  Functions & Triggers
--   5.  Row Level Security
--   6.  Storage bucket + Storage RLS
--   7.  Maintenance (90-day file-cleanup function + optional pg_cron schedule)
--
-- Prerequisites
--   • A Supabase project with default Auth (auth.users table exists)
--   • pg_cron extension enabled in Supabase Dashboard → Database → Extensions
--     (only needed for the scheduled cleanup in Section 7)
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- contracts
-- One row per uploaded contract.
-- contract_text stores the full extracted text (with [PAGE N] markers) so the
-- AI pipeline never needs to re-download the PDF from Storage.
-- file_path is NULL when the Storage upload fails; the text pipeline still works.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  contract_type     text        NOT NULL
                                CHECK (contract_type IN ('nda', 'msa')),
  contract_text     text        NOT NULL,
  file_path         text,                               -- NULL if Storage upload failed
  status            text        NOT NULL DEFAULT 'uploaded'
                                CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  page_count        int         NOT NULL,
  token_estimate    int,                                -- set by API after GPT-4o call
  error_message     text,                              -- populated when status = 'error'
  last_accessed_at  timestamptz NOT NULL DEFAULT now(), -- used for 90-day cleanup
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- key_terms
-- One row per extracted term per contract.
-- original_ai_value is only written on the FIRST user edit, preserving the
-- model's output for accuracy monitoring and fine-tuning feedback loops.
-- user_id is denormalised (redundant with contracts.user_id) to allow
-- direct RLS policies on this table without a JOIN.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_terms (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id       uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name         text        NOT NULL,
  value             text        NOT NULL,
  original_ai_value text,                              -- NULL until first user edit
  page_number       int         NOT NULL DEFAULT 0,    -- 0 means page not identified
  confidence_score  float4      NOT NULL DEFAULT 0
                                CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_sentence   text        NOT NULL DEFAULT '',
  is_custom         boolean     NOT NULL DEFAULT false, -- true for user-added terms
  is_edited         boolean     NOT NULL DEFAULT false, -- true after any user edit
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- chat_sessions
-- One session per (contract, user) pair enforced by the UNIQUE constraint.
-- The API checks for an existing session before creating a new one, so
-- this constraint is the safety net against duplicates.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);

-- -----------------------------------------------------------------------------
-- chat_messages
-- All user and assistant turns for a session.
-- page_citation stores the integer parsed from the mandatory [Page X] tag
-- in assistant responses; NULL on user messages and on HISTORY-context responses
-- (which never cite a page because no contract text was in scope).
-- context_type records which knowledge source the assistant used:
--   'contract' — answered from document text only
--   'history'  — answered from conversation history only
--   'both'     — answered from both sources
-- NULL on user messages and on messages created before v2.0 of the chat system.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text        NOT NULL,
  page_citation int,
  context_type  text        CHECK (context_type IN ('contract', 'history', 'both')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- user_feedback
-- One thumbs-up/down per (contract, user) pair; UNIQUE constraint matches
-- the 409-Conflict the API returns on a duplicate submission.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       text        NOT NULL CHECK (rating IN ('up', 'down')),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user_id
  ON contracts (user_id);

CREATE INDEX IF NOT EXISTS idx_contracts_user_status
  ON contracts (user_id, status);

-- Supports the 90-day cleanup query (WHERE last_accessed_at < now() - '90 days')
CREATE INDEX IF NOT EXISTS idx_contracts_last_accessed
  ON contracts (last_accessed_at);

-- key_terms
CREATE INDEX IF NOT EXISTS idx_key_terms_contract_id
  ON key_terms (contract_id);

CREATE INDEX IF NOT EXISTS idx_key_terms_user_id
  ON key_terms (user_id);

-- Supports low-confidence filtering on the results page
CREATE INDEX IF NOT EXISTS idx_key_terms_confidence
  ON key_terms (contract_id, confidence_score);

-- chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract
  ON chat_sessions (contract_id);

-- chat_messages: ordered history fetch (ascending by created_at within a session)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON chat_messages (session_id, created_at ASC);

-- user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_contract
  ON user_feedback (contract_id);


-- =============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- =============================================================================

-- handle_updated_at
-- Automatically stamps updated_at to now() on any UPDATE.
-- Applied to contracts and key_terms (the only two tables with an updated_at column).
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- contracts: updated_at trigger
DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- key_terms: updated_at trigger
DROP TRIGGER IF EXISTS key_terms_updated_at ON key_terms;
CREATE TRIGGER key_terms_updated_at
  BEFORE UPDATE ON key_terms
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all five tables.
-- Every policy checks user_id = auth.uid(), which is the Supabase Auth JWT claim.

ALTER TABLE contracts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback  ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- contracts policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own contracts"   ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

CREATE POLICY "Users can view own contracts"
  ON contracts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contracts"
  ON contracts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
  ON contracts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contracts"
  ON contracts FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- key_terms policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own key terms"   ON key_terms;
DROP POLICY IF EXISTS "Users can insert own key terms" ON key_terms;
DROP POLICY IF EXISTS "Users can update own key terms" ON key_terms;
DROP POLICY IF EXISTS "Users can delete own key terms" ON key_terms;

CREATE POLICY "Users can view own key terms"
  ON key_terms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own key terms"
  ON key_terms FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own key terms"
  ON key_terms FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own key terms"
  ON key_terms FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- chat_sessions policies
-- Users can only read and create their own sessions; no UPDATE or DELETE
-- (sessions are deleted via cascade when the parent contract is deleted).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own chat sessions"   ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- chat_messages policies
-- Users can only read and append messages; no UPDATE or DELETE
-- (messages are immutable; deleted via cascade on session/contract delete).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own chat messages"   ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_feedback policies
-- No UPDATE policy: feedback is immutable after submission.
-- DELETE handled by ON DELETE CASCADE from contracts.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own feedback"   ON user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON user_feedback;

CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- 6. STORAGE BUCKET + STORAGE RLS
-- =============================================================================

-- Create the private contracts bucket.
-- File path pattern: contracts/{user_id}/{contract_id}/{filename}.pdf
-- Signed URLs (1-hour expiry) are generated server-side only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies.
-- (storage.foldername(name))[1] returns the first path segment of the object
-- name, which by our path convention is the user_id.

DROP POLICY IF EXISTS "Users can upload their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own contracts"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON storage.objects;

CREATE POLICY "Users can upload their own contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own contracts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- 7. MAINTENANCE — 90-DAY FILE CLEANUP
-- =============================================================================
--
-- PDF files in Storage are auto-deleted 90 days after last_accessed_at.
-- This function:
--   1. Marks stale contracts (clears file_path in the DB)
--   2. Returns each cleared row so the caller can also delete the Storage object
--
-- Usage:
--   Called daily by a Supabase Edge Function (scheduled cron) which:
--     a) Calls this SQL function to get the list of stale file_paths
--     b) For each returned file_path, calls supabase.storage.remove([path])
--     c) The file_path column is already NULL in the DB after this function runs
--
-- To schedule with pg_cron (requires pg_cron enabled in Supabase Dashboard):
--   See the cron.schedule call at the bottom of this section.
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_stale_storage_files()
RETURNS TABLE (contract_id uuid, deleted_file_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE contracts
  SET file_path = NULL
  WHERE last_accessed_at < now() - INTERVAL '90 days'
    AND file_path IS NOT NULL
  RETURNING id, file_path;
END;
$$;

-- -----------------------------------------------------------------------------
-- =============================================================================
-- MIGRATION — run this on any existing database that was set up before v2.0
-- =============================================================================
-- ALTER TABLE chat_messages
--   ADD COLUMN IF NOT EXISTS context_type text
--   CHECK (context_type IN ('contract', 'history', 'both'));
-- =============================================================================


-- Optional: pg_cron schedule
-- Uncomment AFTER enabling the pg_cron extension in Supabase Dashboard.
-- This schedules the DB-side cleanup (file_path nulling) daily at 02:00 UTC.
-- The Storage object deletion still requires the companion Edge Function.
-- -----------------------------------------------------------------------------
-- SELECT cron.schedule(
--   'contractiq-cleanup-stale-files',   -- job name (must be unique)
--   '0 2 * * *',                        -- daily at 02:00 UTC
--   $$SELECT cleanup_stale_storage_files()$$
-- );
