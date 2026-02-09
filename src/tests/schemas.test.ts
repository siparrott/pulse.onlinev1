import { describe, it, expect } from 'vitest';
import { channelFormSchema } from '@/lib/schemas/channel';
import { postFormSchema } from '@/lib/schemas/post';

describe('Channel Schema Validation', () => {
  it('should validate a valid channel', () => {
    const validChannel = {
      name: 'Test Channel',
      product_code: 'test-channel',
      status: 'private',
      governance_profile: 'standard',
      allowed_platforms: ['instagram', 'twitter'],
      cadence_rules: { max_posts_per_week: 7 },
      asset_requirements: {},
      default_timezone: 'Europe/London',
      default_schedule_time: '09:00',
    };

    const result = channelFormSchema.safeParse(validChannel);
    expect(result.success).toBe(true);
  });

  it('should reject invalid product code format', () => {
    const invalid = {
      name: 'Test',
      product_code: 'Invalid Code!',
      governance_profile: 'standard',
      allowed_platforms: ['instagram'],
    };

    const result = channelFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty platforms array', () => {
    const invalid = {
      name: 'Test',
      product_code: 'test',
      governance_profile: 'standard',
      allowed_platforms: [],
    };

    const result = channelFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid governance profile', () => {
    const invalid = {
      name: 'Test',
      product_code: 'test',
      governance_profile: 'invalid',
      allowed_platforms: ['instagram'],
    };

    const result = channelFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Post Schema Validation', () => {
  it('should validate a valid post', () => {
    const validPost = {
      channel_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-02-10',
      platform_targets: ['instagram'],
      content_type: 'static',
      caption: 'Test caption',
    };

    const result = postFormSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const invalid = {
      channel_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '02/10/2026',
      platform_targets: ['instagram'],
      content_type: 'static',
      caption: 'Test',
    };

    const result = postFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty caption', () => {
    const invalid = {
      channel_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-02-10',
      platform_targets: ['instagram'],
      content_type: 'static',
      caption: '',
    };

    const result = postFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid content type', () => {
    const invalid = {
      channel_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-02-10',
      platform_targets: ['instagram'],
      content_type: 'video',
      caption: 'Test',
    };

    const result = postFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const minimal = {
      channel_id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-02-10',
      platform_targets: ['instagram'],
      content_type: 'static',
      caption: 'Just caption',
    };

    const result = postFormSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
