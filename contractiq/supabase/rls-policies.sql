-- =============================================================================
-- ContractIQ — Security RLS Policies & Rate Limiting
-- =============================================================================
-- Paste into Supabase SQL Editor. Safe to re-run (all statements are idempotent).
-- This extends the base schema in database.sql.
-- =============================================================================


-- =============================================================================
-- RATE LIMITING TABLE
-- =============================================================================
-- Sliding-window rate limiting via INSERT + COUNT.
-- All reads/writes use the service role (createAdminClient) — users cannot
-- manipulate their own event counts because no user-facing SELECT/INSERT policy
-- is created here.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON rate_limit_events (user_id, action, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only. Users cannot read or write
-- their own rate-limit records, preventing self-manipulation of counts.


-- =============================================================================
-- RE-ENABLE RLS ON ALL APPLICATION TABLES (idempotent)
-- =============================================================================
ALTER TABLE contracts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- RATE LIMIT EVENT CLEANUP
-- =============================================================================
-- Deletes events older than the longest rate-limit window (1 day) to keep the
-- table compact. Schedule this daily with pg_cron.

CREATE OR REPLACE FUNCTION cleanup_rate_limit_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_events
  WHERE created_at < now() - INTERVAL '1 day';
END;
$$;

-- Uncomment after enabling pg_cron in Supabase Dashboard → Database → Extensions:
-- SELECT cron.schedule(
--   'contractiq-cleanup-rate-limits',
--   '0 3 * * *',
--   $$SELECT cleanup_rate_limit_events()$$
-- );
