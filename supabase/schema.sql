-- Pulse.Online Database Schema
-- Internal Governed Publishing System

------------------------------------------------------------
-- 1) PUBLISHER CHANNELS
------------------------------------------------------------
CREATE TABLE publisher_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'private'
    CHECK (status IN ('private', 'beta', 'public')),
  governance_profile text NOT NULL
    CHECK (governance_profile IN ('strict', 'standard', 'experimental')),
  allowed_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  cadence_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  asset_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_timezone text NOT NULL DEFAULT 'Europe/London',
  default_schedule_time time NOT NULL DEFAULT '09:00',
  archived_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for product code lookups
CREATE INDEX idx_channels_product_code ON publisher_channels(product_code);

------------------------------------------------------------
-- 2) PUBLISHER POSTS
------------------------------------------------------------
CREATE TABLE publisher_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  date date NOT NULL,
  scheduled_at timestamptz NULL,
  platform_targets jsonb NOT NULL,
  content_type text NOT NULL
    CHECK (content_type IN ('reel', 'static', 'carousel', 'text')),
  theme text NULL,
  caption text NOT NULL,
  cta text NULL,
  hashtags text NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'needs_edits', 'blocked', 'scheduled', 'published', 'failed')),
  governance_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (governance_status IN ('unreviewed', 'allowed', 'allowed_with_edits', 'blocked')),
  governance_score int NOT NULL DEFAULT 0,
  governance_refusals jsonb NOT NULL DEFAULT '[]'::jsonb,
  governance_unlock_path text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_posts_channel_id ON publisher_posts(channel_id);
CREATE INDEX idx_posts_date ON publisher_posts(date);
CREATE INDEX idx_posts_status ON publisher_posts(status);
CREATE INDEX idx_posts_governance_status ON publisher_posts(governance_status);

------------------------------------------------------------
-- 3) PUBLISHER ASSETS
------------------------------------------------------------
CREATE TABLE publisher_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  post_id uuid NULL REFERENCES publisher_posts(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text NULL,
  file_size int NULL,
  role text NOT NULL DEFAULT 'decorative'
    CHECK (role IN ('proof', 'decorative', 'educational', 'ui')),
  quality_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (quality_status IN ('unreviewed', 'ok', 'warning', 'blocked')),
  notes text NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_assets_channel_id ON publisher_assets(channel_id);
CREATE INDEX idx_assets_post_id ON publisher_assets(post_id);

------------------------------------------------------------
-- 4) PUBLISHER GOVERNANCE EVENTS
------------------------------------------------------------
CREATE TABLE publisher_governance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  post_id uuid NULL REFERENCES publisher_posts(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_governance_events_channel_id ON publisher_governance_events(channel_id);
CREATE INDEX idx_governance_events_post_id ON publisher_governance_events(post_id);
CREATE INDEX idx_governance_events_type ON publisher_governance_events(event_type);

------------------------------------------------------------
-- TRIGGERS: Auto-update updated_at
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON publisher_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON publisher_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

------------------------------------------------------------
-- STORAGE BUCKET
------------------------------------------------------------
-- Run this in Supabase Dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('publisher-assets', 'publisher-assets', false);

-- Storage policy for authenticated users (internal use):
-- CREATE POLICY "Internal access" ON storage.objects
-- FOR ALL USING (bucket_id = 'publisher-assets');
