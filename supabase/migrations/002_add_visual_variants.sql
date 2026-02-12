-- Migration: Add Phase 2 visual variant generation fields
-- Date: 2026-02-10

-- Add new columns for variant generation
ALTER TABLE publisher_posts
  ADD COLUMN IF NOT EXISTS visual_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_variant_mode text NOT NULL DEFAULT 'auto'
    CHECK (visual_variant_mode IN ('auto', 'ai')),
  ADD COLUMN IF NOT EXISTS variant_generation_status text NOT NULL DEFAULT 'idle'
    CHECK (variant_generation_status IN ('idle', 'generating', 'partial', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS variant_last_generated_at timestamptz NULL;

-- Update existing posts to have default values
UPDATE publisher_posts
SET 
  visual_variants = '[]'::jsonb,
  visual_variant_mode = 'auto',
  variant_generation_status = 'idle',
  variant_last_generated_at = NULL
WHERE visual_variants IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN publisher_posts.visual_variants IS 'Phase 2: Array of platform-specific generated image variants with governance results';
COMMENT ON COLUMN publisher_posts.visual_variant_mode IS 'Phase 2: Generation mode - auto (crop/pad) or ai (image generation)';
COMMENT ON COLUMN publisher_posts.variant_generation_status IS 'Phase 2: Status of variant generation process';
COMMENT ON COLUMN publisher_posts.variant_last_generated_at IS 'Phase 2: Timestamp of last successful variant generation';
