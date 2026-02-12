import { z } from 'zod';
import { platformSchema } from './channel';

export const contentTypeSchema = z.enum(['reel', 'static', 'carousel', 'text']);

export const postStatusSchema = z.enum([
  'draft',
  'validated',
  'needs_edits',
  'blocked',
  'scheduled',
  'published',
  'failed',
]);

export const governanceStatusSchema = z.enum([
  'unreviewed',
  'allowed',
  'allowed_with_edits',
  'blocked',
]);

export const postFormSchema = z.object({
  channel_id: z.string().uuid('Invalid channel'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  platform_targets: z.array(platformSchema).min(1, 'Select at least one platform'),
  content_type: contentTypeSchema,
  theme: z.string().max(200).optional(),
  caption: z.string().min(1, 'Caption is required').max(2200),
  cta: z.string().max(500).optional(),
  hashtags: z.string().max(500).optional(),
  // Phase 1: Platform-safe media detection
  visual_handling: z.enum(['single', 'variants']).default('single'),
  media_aspect_ratio: z.number().nullable().optional(),
  media_risk_by_platform: z.record(z.enum(['ok', 'warn', 'unknown'])).optional(),
  // Phase 2: Visual variant generation
  visual_variants: z.array(z.any()).optional(),
  visual_variant_mode: z.enum(['auto', 'ai']).default('auto'),
  variant_generation_status: z.enum(['idle', 'generating', 'partial', 'ready', 'failed']).default('idle'),
  variant_last_generated_at: z.string().nullable().optional(),
});

export const postUpdateSchema = postFormSchema.partial().extend({
  id: z.string().uuid(),
});

export type PostFormInput = z.infer<typeof postFormSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

// CSV column mapping schema
export const columnMappingSchema = z.object({
  date: z.string().min(1, 'Date column is required'),
  platform_targets: z.string().min(1, 'Platform column is required'),
  content_type: z.string().min(1, 'Content type column is required'),
  theme: z.string().optional(),
  caption: z.string().min(1, 'Caption column is required'),
  cta: z.string().optional(),
  hashtags: z.string().optional(),
});

export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;
