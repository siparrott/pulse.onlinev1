-- ============================================================
-- Migration 001: Brand Packs + FK from publisher_channels
-- AxixOS - Brand Pack Onboarding System
-- ============================================================

BEGIN;

------------------------------------------------------------
-- 1) Create brand_packs table
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_packs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid NOT NULL REFERENCES publisher_channels(id) ON DELETE CASCADE,
  identity        jsonb NOT NULL DEFAULT '{}'::jsonb,
  language_rules  jsonb NOT NULL DEFAULT '{}'::jsonb,
  visual_rules    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt_anchors jsonb NOT NULL DEFAULT '{}'::jsonb,
  governance_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  examples        jsonb NULL,
  completeness    int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enforce 1:1 relationship: one Brand Pack per channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_packs_channel_id
  ON brand_packs(channel_id);

-- Index for completeness queries
CREATE INDEX IF NOT EXISTS idx_brand_packs_completeness
  ON brand_packs(completeness);

------------------------------------------------------------
-- 2) Add brand_pack_id column to publisher_channels
------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publisher_channels' AND column_name = 'brand_pack_id'
  ) THEN
    ALTER TABLE publisher_channels
    ADD COLUMN brand_pack_id uuid NULL;
  END IF;
END $$;

-- Add FK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_channels_brand_pack'
  ) THEN
    ALTER TABLE publisher_channels
    ADD CONSTRAINT fk_channels_brand_pack
    FOREIGN KEY (brand_pack_id) REFERENCES brand_packs(id) ON DELETE SET NULL;
  END IF;
END $$;

------------------------------------------------------------
-- 3) Auto-update trigger for brand_packs.updated_at
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_brand_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brand_packs_updated_at ON brand_packs;
CREATE TRIGGER trg_brand_packs_updated_at
  BEFORE UPDATE ON brand_packs
  FOR EACH ROW EXECUTE FUNCTION update_brand_packs_updated_at();

------------------------------------------------------------
-- 4) Backfill: create default Brand Packs for existing channels
------------------------------------------------------------
INSERT INTO brand_packs (channel_id, identity, language_rules, visual_rules, ai_prompt_anchors, governance_overrides, completeness)
SELECT
  c.id,
  -- Identity defaults
  jsonb_build_object(
    'mission', '',
    'audience', '',
    'brandPersonality', '["authoritative"]'::jsonb,
    'riskTolerance', CASE c.governance_profile
      WHEN 'strict' THEN 'low'
      WHEN 'experimental' THEN 'high'
      ELSE 'medium'
    END
  ),
  -- Language rules defaults
  jsonb_build_object(
    'requiredCTA', c.governance_profile = 'strict',
    'requiredHashtags', c.governance_profile = 'strict',
    'forbiddenClaims', CASE c.governance_profile
      WHEN 'strict' THEN '["guaranteed","best","revolutionary","miracle"]'::jsonb
      ELSE '[]'::jsonb
    END,
    'forbiddenComparisons', c.governance_profile = 'strict',
    'toneConstraints', jsonb_build_object(
      'avoidSalesy', c.governance_profile = 'strict',
      'avoidHype', c.governance_profile = 'strict',
      'allowHumor', c.governance_profile = 'experimental'
    )
  ),
  -- Visual rules defaults
  jsonb_build_object(
    'stylePreferences', CASE c.governance_profile
      WHEN 'experimental' THEN '["illustration","abstract"]'::jsonb
      ELSE '["photography"]'::jsonb
    END,
    'realismLevel', CASE c.governance_profile
      WHEN 'experimental' THEN 'stylized'
      ELSE 'photorealistic'
    END,
    'allowAIPeople', true,
    'allowRealPeople', true,
    'allowTextInImage', c.governance_profile != 'strict',
    'colorMoodHints', '[]'::jsonb,
    'forbiddenVisualMotifs', CASE c.governance_profile
      WHEN 'strict' THEN '["fake testimonials","before/after","exaggerated results"]'::jsonb
      ELSE '[]'::jsonb
    END
  ),
  -- AI prompt anchors defaults
  jsonb_build_object(
    'imageSystemPrompt', 'Generate professional marketing imagery that aligns with brand guidelines.',
    'imageStylePrompt', 'Clean, modern, high-quality visual style.'
  ),
  -- Governance overrides
  jsonb_build_object(
    'requireVariantApproval', c.governance_profile = 'strict',
    'escalateVisualWarnings', c.governance_profile = 'strict'
  ),
  -- Default completeness (skeleton only = 20%)
  20
FROM publisher_channels c
WHERE c.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM brand_packs bp WHERE bp.channel_id = c.id
  );

------------------------------------------------------------
-- 5) Link channels to their brand packs
------------------------------------------------------------
UPDATE publisher_channels c
SET brand_pack_id = bp.id
FROM brand_packs bp
WHERE bp.channel_id = c.id
  AND c.brand_pack_id IS NULL;

COMMIT;
