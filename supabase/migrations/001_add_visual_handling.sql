-- Migration: Add Phase 1 visual handling fields to publisher_posts
-- Date: 2026-02-10

-- Add new columns for platform-safe media detection
ALTER TABLE publisher_posts
  ADD COLUMN IF NOT EXISTS visual_handling text NOT NULL DEFAULT 'single'
    CHECK (visual_handling IN ('single', 'variants')),
  ADD COLUMN IF NOT EXISTS media_aspect_ratio numeric NULL,
  ADD COLUMN IF NOT EXISTS media_risk_by_platform jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Update existing posts to have default values
UPDATE publisher_posts
SET 
  visual_handling = 'single',
  media_aspect_ratio = NULL,
  media_risk_by_platform = '{}'::jsonb
WHERE visual_handling IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN publisher_posts.visual_handling IS 'Phase 1: How to handle media across platforms - single image or platform-specific variants';
COMMENT ON COLUMN publisher_posts.media_aspect_ratio IS 'Phase 1: Detected aspect ratio of primary media asset (width/height)';
COMMENT ON COLUMN publisher_posts.media_risk_by_platform IS 'Phase 1: Platform-by-platform cropping risk assessment (ok/warn/unknown)';
