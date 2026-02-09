import { describe, it, expect } from 'vitest';
import { validatePost, patterns } from '@/lib/governance/validator';
import type { PublisherPost, PublisherChannel, PublisherAsset } from '@/lib/types/database';

const createMockPost = (overrides: Partial<PublisherPost> = {}): PublisherPost => ({
  id: 'test-post-1',
  channel_id: 'test-channel-1',
  date: '2026-02-10',
  scheduled_at: null,
  platform_targets: ['instagram'],
  content_type: 'static',
  theme: 'Test',
  caption: 'This is a test caption for our product.',
  cta: 'Learn more at example.com',
  hashtags: '#test #product',
  status: 'draft',
  governance_status: 'unreviewed',
  governance_score: 0,
  governance_refusals: [],
  governance_unlock_path: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockChannel = (
  profile: 'strict' | 'standard' | 'experimental',
  overrides: Partial<PublisherChannel> = {}
): PublisherChannel => ({
  id: 'test-channel-1',
  name: 'Test Channel',
  product_code: 'test',
  status: 'private',
  governance_profile: profile,
  allowed_platforms: ['instagram', 'twitter'],
  cadence_rules: { max_posts_per_week: 7 },
  asset_requirements:
    profile === 'strict'
      ? { static_requires_image: true, carousel_requires_image: true }
      : { image_recommended: true },
  default_timezone: 'Europe/London',
  default_schedule_time: '09:00',
  archived_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockAsset = (overrides: Partial<PublisherAsset> = {}): PublisherAsset => ({
  id: 'test-asset-1',
  channel_id: 'test-channel-1',
  post_id: 'test-post-1',
  storage_path: '/test/image.jpg',
  filename: 'image.jpg',
  mime_type: 'image/jpeg',
  file_size: 100000,
  role: 'decorative',
  quality_status: 'ok',
  notes: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('Governance Validator', () => {
  describe('STRICT profile', () => {
    const strictChannel = createMockChannel('strict');

    it('should allow clean posts with all requirements met', () => {
      const post = createMockPost();
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('allowed');
      expect(result.score).toBe(100);
      expect(result.refusals).toHaveLength(0);
    });

    it('should block posts with hype language "guaranteed"', () => {
      const post = createMockPost({
        caption: 'This is guaranteed to work!',
      });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'no_hype')).toBe(true);
    });

    it('should block posts with hype language "revolutionary"', () => {
      const post = createMockPost({
        caption: 'Our revolutionary new approach',
      });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'no_hype')).toBe(true);
    });

    it('should block posts with comparison claims', () => {
      const post = createMockPost({
        caption: 'Better than our competitors in every way',
      });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'no_unproven_comparisons')).toBe(true);
    });

    it('should block posts missing CTA', () => {
      const post = createMockPost({ cta: null });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'cta_required')).toBe(true);
    });

    it('should block posts missing hashtags', () => {
      const post = createMockPost({ hashtags: null });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'hashtags_required')).toBe(true);
    });

    it('should block static posts without images', () => {
      const post = createMockPost({ content_type: 'static' });
      const assets: PublisherAsset[] = [];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'image_required')).toBe(true);
    });

    it('should block carousel posts without images', () => {
      const post = createMockPost({ content_type: 'carousel' });
      const assets: PublisherAsset[] = [];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'image_required')).toBe(true);
    });

    it('should allow text posts without images', () => {
      const post = createMockPost({ content_type: 'text' });
      const assets: PublisherAsset[] = [];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.refusals.some((r) => r.rule === 'image_required')).toBe(false);
    });

    it('should block spam language', () => {
      const post = createMockPost({
        caption: 'Click here to buy now! Free money awaits!',
      });
      const assets = [createMockAsset()];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.status).toBe('blocked');
      expect(result.refusals.some((r) => r.rule === 'no_spam')).toBe(true);
    });

    it('should calculate score based on violations', () => {
      const post = createMockPost({
        caption: 'Guaranteed results!',
        cta: null,
        hashtags: null,
      });
      const assets: PublisherAsset[] = [];
      
      const result = validatePost(post, strictChannel, assets);
      
      expect(result.score).toBeLessThan(50);
      expect(result.refusals.length).toBeGreaterThan(1);
    });
  });

  describe('STANDARD profile', () => {
    const standardChannel = createMockChannel('standard');

    it('should allow softer benefit language', () => {
      const post = createMockPost({
        caption: 'Our product helps you achieve great results!',
        cta: null, // Not required in standard
        hashtags: null, // Not required in standard
      });
      
      const result = validatePost(post, standardChannel, []);
      
      expect(result.status).not.toBe('blocked');
    });

    it('should warn on guarantee language but not block', () => {
      const post = createMockPost({
        caption: 'Guaranteed to improve your workflow',
      });
      
      const result = validatePost(post, standardChannel, []);
      
      expect(result.refusals.some((r) => r.rule === 'no_guarantees')).toBe(true);
      expect(result.refusals.find((r) => r.rule === 'no_guarantees')?.severity).toBe('warning');
    });

    it('should still block spam', () => {
      const post = createMockPost({
        caption: 'Click here to buy now!',
      });
      
      const result = validatePost(post, standardChannel, []);
      
      expect(result.status).toBe('blocked');
    });

    it('should recommend images but not require them', () => {
      const post = createMockPost({ content_type: 'static' });
      
      const result = validatePost(post, standardChannel, []);
      
      const imageRefusal = result.refusals.find((r) => r.rule === 'image_recommended');
      expect(imageRefusal?.severity).toBe('warning');
    });
  });

  describe('EXPERIMENTAL profile', () => {
    const experimentalChannel = createMockChannel('experimental');

    it('should allow creative language', () => {
      const post = createMockPost({
        caption: 'This is a game-changer! Revolutionary stuff! 🚀',
        cta: null,
        hashtags: null,
      });
      
      const result = validatePost(post, experimentalChannel, []);
      
      expect(result.status).toBe('allowed');
    });

    it('should still block spam', () => {
      const post = createMockPost({
        caption: 'Free money! Click here! DM me for secrets!',
      });
      
      const result = validatePost(post, experimentalChannel, []);
      
      expect(result.status).toBe('blocked');
    });

    it('should still block scam patterns', () => {
      const post = createMockPost({
        caption: 'Crypto investment opportunity for passive income!',
      });
      
      const result = validatePost(post, experimentalChannel, []);
      
      expect(result.status).toBe('blocked');
    });

    it('should not require images', () => {
      const post = createMockPost({ content_type: 'static' });
      
      const result = validatePost(post, experimentalChannel, []);
      
      expect(result.refusals.some((r) => r.rule === 'image_required')).toBe(false);
    });
  });

  describe('Unlock path generation', () => {
    it('should provide actionable unlock paths', () => {
      const post = createMockPost({
        caption: 'Guaranteed better than competitors!',
        cta: null,
        hashtags: null,
      });
      
      const result = validatePost(post, createMockChannel('strict'), []);
      
      expect(result.unlock_path).toBeTruthy();
      expect(result.unlock_path).toContain('hype');
      expect(result.unlock_path).toContain('call-to-action');
    });
  });

  describe('Pattern detection', () => {
    it('should detect "guaranteed 100%" as hype', () => {
      expect(patterns.HYPE_PATTERNS.some((p) => p.test('guaranteed 100% results'))).toBe(true);
    });

    it('should detect "best in the world" as hype', () => {
      expect(patterns.HYPE_PATTERNS.some((p) => p.test('best in the world'))).toBe(true);
    });

    it('should detect MLM patterns as scam', () => {
      expect(patterns.SCAM_PATTERNS.some((p) => p.test('multi-level marketing opportunity'))).toBe(true);
    });
  });
});
