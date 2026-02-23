-- Phase 4: Deterministic Variant Builder
-- Adds post_variants table and source_image fields to publisher_posts

-- 1. New columns on publisher_posts for source image + strategy
ALTER TABLE publisher_posts
  ADD COLUMN IF NOT EXISTS source_image       JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_platforms  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_strategy    TEXT  DEFAULT 'single_image'
    CHECK (variant_strategy IN ('single_image', 'platform_safe'));

-- 2. Separate table for persisted variant files
CREATE TABLE IF NOT EXISTS post_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES publisher_posts(id) ON DELETE CASCADE,
  platform_id     TEXT NOT NULL,
  storage_key     TEXT NOT NULL,
  public_url      TEXT,
  width           INTEGER NOT NULL,
  height          INTEGER NOT NULL,
  format          TEXT NOT NULL DEFAULT 'jpg',
  bytes           INTEGER NOT NULL DEFAULT 0,
  upscale_warning BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_variants_post_id ON post_variants(post_id);

-- 3. Build log table for observability
CREATE TABLE IF NOT EXISTS variant_build_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES publisher_posts(id) ON DELETE CASCADE,
  count        INTEGER NOT NULL DEFAULT 0,
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  errors       JSONB DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);
