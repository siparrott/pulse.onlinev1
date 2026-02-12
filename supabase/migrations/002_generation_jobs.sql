-- ============================================================
-- Phase 3A: Generation Jobs Queue + Image Storage + Cost Control
-- ============================================================

------------------------------------------------------------
-- 1) GENERATION JOBS TABLE  (DB-backed job queue)
------------------------------------------------------------
CREATE TABLE generation_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL REFERENCES publisher_posts(id) ON DELETE CASCADE,
  channel_id    uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  platform_key  text NOT NULL,
  target_aspect text NOT NULL,

  -- Idempotency: same compound key = same image, skip regeneration
  idempotency_key text NOT NULL,

  -- Job lifecycle
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'done', 'failed', 'dead')),
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 3,
  next_run_at   timestamptz NOT NULL DEFAULT now(),

  -- Input snapshot (everything the worker needs — no base64)
  prompt_hash       text NOT NULL,
  brand_pack_hash   text NOT NULL DEFAULT 'none',
  caption_hash      text NOT NULL DEFAULT 'none',
  prompt_text       text NOT NULL,          -- redacted before storage
  brand_pack_id     uuid NULL,
  channel_code      text NOT NULL DEFAULT '',
  post_caption      text NOT NULL DEFAULT '',  -- redacted

  -- Result (populated by worker on success)
  storage_path      text NULL,              -- Supabase Storage key
  storage_sha256    text NULL,              -- content-addressed dedupe
  result_width      int NULL,
  result_height     int NULL,
  result_mime_type  text NULL,
  revised_prompt    text NULL,
  vision_verdict    jsonb NULL,
  vision_issues     jsonb NULL,
  vision_status     text NULL
    CHECK (vision_status IS NULL OR vision_status IN ('ok', 'warn', 'blocked')),
  governance_json   jsonb NULL,

  -- Error (populated on failure)
  error_code        text NULL,
  error_message     text NULL,

  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Idempotency index — prevents duplicate jobs for same inputs
CREATE UNIQUE INDEX idx_generation_jobs_idempotency
  ON generation_jobs(idempotency_key)
  WHERE status NOT IN ('failed', 'dead');

-- Worker poll index — ordered queue pickup
CREATE INDEX idx_generation_jobs_poll
  ON generation_jobs(status, next_run_at)
  WHERE status IN ('queued');

-- Post lookup — fetch all jobs for a given post
CREATE INDEX idx_generation_jobs_post
  ON generation_jobs(post_id, created_at DESC);

-- Channel lookup — for quota counting
CREATE INDEX idx_generation_jobs_channel_date
  ON generation_jobs(channel_id, created_at)
  WHERE status = 'done';

-- Auto-update trigger
CREATE TRIGGER update_generation_jobs_updated_at
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


------------------------------------------------------------
-- 2) GENERATION QUOTAS  (per-channel daily cap tracking)
------------------------------------------------------------
CREATE TABLE generation_quotas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  count       int NOT NULL DEFAULT 0,

  CONSTRAINT uq_quota_channel_date UNIQUE (channel_id, date)
);

CREATE INDEX idx_quotas_lookup
  ON generation_quotas(channel_id, date);


------------------------------------------------------------
-- 3) PER-CHANNEL AI CAP COLUMN
------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publisher_channels' AND column_name = 'ai_daily_cap'
  ) THEN
    ALTER TABLE publisher_channels
      ADD COLUMN ai_daily_cap int NOT NULL DEFAULT 50;
  END IF;
END $$;


------------------------------------------------------------
-- 4) SUPABASE STORAGE BUCKET
------------------------------------------------------------
-- Safe idempotent insert — Supabase auto-creates the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('publisher-assets', 'publisher-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service-role full access (worker uses service role key)
CREATE POLICY "Service role full access" ON storage.objects
  FOR ALL
  USING (bucket_id = 'publisher-assets')
  WITH CHECK (bucket_id = 'publisher-assets');
