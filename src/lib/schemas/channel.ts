import { z } from 'zod';

export const platformSchema = z.enum([
  'instagram',
  'twitter',
  'linkedin',
  'facebook',
  'tiktok',
  'youtube',
  'pinterest',
]);

export const governanceProfileSchema = z.enum(['strict', 'standard', 'experimental']);

export const channelStatusSchema = z.enum(['private', 'beta', 'public']);

export const cadenceRulesSchema = z.object({
  min_days_between_posts: z.number().min(0).optional(),
  max_posts_per_week: z.number().min(1).max(50).optional(),
  preferred_days: z.array(z.string()).optional(),
});

export const assetRequirementsSchema = z.object({
  static_requires_image: z.boolean().optional(),
  carousel_requires_image: z.boolean().optional(),
  image_recommended: z.boolean().optional(),
  min_image_width: z.number().min(100).optional(),
  proof_required_for_claims: z.boolean().optional(),
});

export const channelFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  product_code: z
    .string()
    .min(1, 'Product code is required')
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Product code must be lowercase alphanumeric with dashes/underscores'),
  status: channelStatusSchema.default('private'),
  governance_profile: governanceProfileSchema,
  allowed_platforms: z.array(platformSchema).min(1, 'Select at least one platform'),
  cadence_rules: cadenceRulesSchema.default({}),
  asset_requirements: assetRequirementsSchema.default({}),
  default_timezone: z.string().default('Europe/London'),
  default_schedule_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').default('09:00'),
});

export type ChannelFormInput = z.infer<typeof channelFormSchema>;
