-- AxixOS Seed Data
-- Initial product channels

INSERT INTO publisher_channels (name, product_code, status, governance_profile, allowed_platforms, cadence_rules, asset_requirements)
VALUES
  -- STRICT governance channels
  (
    'Infinite Authority',
    'ia',
    'private',
    'strict',
    '["instagram", "linkedin", "twitter"]'::jsonb,
    '{"min_days_between_posts": 1, "max_posts_per_week": 7, "preferred_days": ["monday", "wednesday", "friday"]}'::jsonb,
    '{"static_requires_image": true, "carousel_requires_image": true, "min_image_width": 1080}'::jsonb
  ),
  (
    'ContextEmbed',
    'contextembed',
    'private',
    'strict',
    '["linkedin", "twitter"]'::jsonb,
    '{"min_days_between_posts": 2, "max_posts_per_week": 5}'::jsonb,
    '{"static_requires_image": true, "carousel_requires_image": true}'::jsonb
  ),
  (
    'SiteFixEngine',
    'sitefixengine',
    'private',
    'strict',
    '["linkedin", "twitter", "instagram"]'::jsonb,
    '{"min_days_between_posts": 1, "max_posts_per_week": 7}'::jsonb,
    '{"static_requires_image": true}'::jsonb
  ),
  (
    'Zenfolio / PixieSet Liberator',
    'assetliberator',
    'private',
    'strict',
    '["instagram", "facebook", "twitter"]'::jsonb,
    '{"min_days_between_posts": 2, "max_posts_per_week": 4}'::jsonb,
    '{"static_requires_image": true, "proof_required_for_claims": true}'::jsonb
  ),

  -- STANDARD governance channels
  (
    'QuoteKits',
    'quotekits',
    'private',
    'standard',
    '["instagram", "pinterest", "twitter"]'::jsonb,
    '{"min_days_between_posts": 1, "max_posts_per_week": 10}'::jsonb,
    '{"image_recommended": true}'::jsonb
  ),
  (
    'TogNinja',
    'togninja',
    'private',
    'standard',
    '["instagram", "twitter", "youtube"]'::jsonb,
    '{"min_days_between_posts": 1, "max_posts_per_week": 7}'::jsonb,
    '{"image_recommended": true}'::jsonb
  ),

  -- EXPERIMENTAL governance channels
  (
    'ChaosCut',
    'chaoscut',
    'private',
    'experimental',
    '["instagram", "tiktok", "youtube"]'::jsonb,
    '{"min_days_between_posts": 0, "max_posts_per_week": 14}'::jsonb,
    '{}'::jsonb
  ),
  (
    'BatchLight',
    'batchlight',
    'private',
    'experimental',
    '["instagram", "twitter", "youtube"]'::jsonb,
    '{"min_days_between_posts": 0, "max_posts_per_week": 14}'::jsonb,
    '{}'::jsonb
  ),
  (
    'ShootCleaner',
    'shootcleaner',
    'private',
    'experimental',
    '["instagram", "twitter", "youtube"]'::jsonb,
    '{"min_days_between_posts": 0, "max_posts_per_week": 14}'::jsonb,
    '{}'::jsonb
  );
