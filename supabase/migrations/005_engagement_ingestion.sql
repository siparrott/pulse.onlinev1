-- Phase 6: Engagement Ingestion
-- Metrics snapshots, rollups, and user engagement events

------------------------------------------------------------
-- 1) ENGAGEMENT SNAPSHOTS (time-series per delivery)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engagement_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL DEFAULT 'default',
  platform_id       TEXT NOT NULL,
  connection_id     UUID NOT NULL REFERENCES user_platform_connections(id),
  post_delivery_id  UUID NOT NULL REFERENCES post_deliveries(id) ON DELETE CASCADE,
  platform_post_id  TEXT NOT NULL,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metrics           JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw               JSONB NOT NULL DEFAULT '{}'::jsonb,
  ok                BOOLEAN NOT NULL DEFAULT true,
  error             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_delivery_time
  ON engagement_snapshots(post_delivery_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_time
  ON engagement_snapshots(user_id, captured_at DESC);

------------------------------------------------------------
-- 2) ENGAGEMENT ROLLUPS (latest totals per delivery)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engagement_rollups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL DEFAULT 'default',
  post_delivery_id  UUID NOT NULL REFERENCES post_deliveries(id) ON DELETE CASCADE,
  platform_id       TEXT NOT NULL,
  last_captured_at  TIMESTAMPTZ,
  totals            JSONB NOT NULL DEFAULT '{}'::jsonb,
  deltas_24h        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollups_delivery
  ON engagement_rollups(post_delivery_id);

------------------------------------------------------------
-- 3) USER ENGAGEMENT EVENTS (spikes, milestones, errors)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_engagement_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL DEFAULT 'default',
  type              TEXT NOT NULL CHECK (type IN ('spike', 'milestone', 'comment', 'error')),
  post_delivery_id  UUID REFERENCES post_deliveries(id) ON DELETE CASCADE,
  platform_id       TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_time
  ON user_engagement_events(user_id, occurred_at DESC);

------------------------------------------------------------
-- 4) AUTO-UPDATE updated_at trigger for rollups
------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_rollups') THEN
    CREATE TRIGGER set_updated_at_rollups
      BEFORE UPDATE ON engagement_rollups
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
