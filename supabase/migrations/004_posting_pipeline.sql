-- Phase 5: Posting Pipeline
-- OAuth connections, scheduling, delivery tracking, job logs

------------------------------------------------------------
-- 1) USER PLATFORM CONNECTIONS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_platform_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL DEFAULT 'default',
  platform_id             TEXT NOT NULL,
  account_label           TEXT NOT NULL DEFAULT '',
  external_account_id     TEXT NOT NULL DEFAULT '',
  access_token_encrypted  TEXT NOT NULL DEFAULT '',
  refresh_token_encrypted TEXT,
  token_expires_at        TIMESTAMPTZ,
  scopes                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                  TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'expired', 'revoked', 'error')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connections_user_platform
  ON user_platform_connections(user_id, platform_id);

------------------------------------------------------------
-- 2) POST SCHEDULES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL DEFAULT 'default',
  post_id         UUID NOT NULL REFERENCES publisher_posts(id) ON DELETE CASCADE,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'publishing', 'partially_published', 'published', 'failed', 'cancelled')),
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_due
  ON post_schedules(scheduled_for, status);

------------------------------------------------------------
-- 3) POST DELIVERIES (one per platform target)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_schedule_id    UUID NOT NULL REFERENCES post_schedules(id) ON DELETE CASCADE,
  platform_id         TEXT NOT NULL,
  connection_id       UUID NOT NULL REFERENCES user_platform_connections(id),
  variant_storage_key TEXT,
  caption             TEXT NOT NULL DEFAULT '',
  link_url            TEXT,
  status              TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'publishing', 'published', 'failed', 'skipped')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  last_error          TEXT,
  platform_post_id    TEXT,
  published_at        TIMESTAMPTZ,
  next_retry_at       TIMESTAMPTZ,
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status_retry
  ON post_deliveries(status, next_retry_at);

------------------------------------------------------------
-- 4) JOB RUN LOGS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_run_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT NOT NULL DEFAULT 'publish',
  post_schedule_id  UUID REFERENCES post_schedules(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  ok                BOOLEAN NOT NULL DEFAULT false,
  summary           JSONB NOT NULL DEFAULT '{}'::jsonb,
  error             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

------------------------------------------------------------
-- 5) AUTO-UPDATE updated_at triggers
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_connections') THEN
    CREATE TRIGGER set_updated_at_connections
      BEFORE UPDATE ON user_platform_connections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_schedules') THEN
    CREATE TRIGGER set_updated_at_schedules
      BEFORE UPDATE ON post_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_deliveries') THEN
    CREATE TRIGGER set_updated_at_deliveries
      BEFORE UPDATE ON post_deliveries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
