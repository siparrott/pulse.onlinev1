import { z } from 'zod';
import type { BrandPersonality, VisualStyle } from '@/lib/types/database';

export const brandPersonalitySchema = z.enum([
  'authoritative',
  'calm',
  'experimental',
  'playful',
  'technical',
  'editorial',
]);

export const riskToleranceSchema = z.enum(['low', 'medium', 'high']);

export const visualStyleSchema = z.enum([
  'photography',
  'illustration',
  'ui_mockup',
  'abstract',
  'diagram',
]);

export const realismLevelSchema = z.enum(['photorealistic', 'stylized', 'abstract']);

export const brandPackSchema = z.object({
  identity: z.object({
    mission: z.string().min(10).max(280),
    audience: z.string().min(5).max(200),
    brandPersonality: z.array(brandPersonalitySchema).min(1).max(3),
    riskTolerance: riskToleranceSchema,
  }),
  languageRules: z.object({
    requiredCTA: z.boolean(),
    requiredHashtags: z.boolean(),
    forbiddenClaims: z.array(z.string()),
    forbiddenComparisons: z.boolean(),
    toneConstraints: z.object({
      avoidSalesy: z.boolean(),
      avoidHype: z.boolean(),
      allowHumor: z.boolean(),
    }),
  }),
  visualRules: z.object({
    stylePreferences: z.array(visualStyleSchema).min(1),
    realismLevel: realismLevelSchema,
    allowAIPeople: z.boolean(),
    allowRealPeople: z.boolean(),
    allowTextInImage: z.boolean(),
    colorMoodHints: z.array(z.string()),
    forbiddenVisualMotifs: z.array(z.string()),
  }),
  aiPromptAnchors: z.object({
    imageSystemPrompt: z.string().min(20),
    imageStylePrompt: z.string().min(20),
  }),
  governanceOverrides: z.object({
    requireVariantApproval: z.boolean(),
    escalateVisualWarnings: z.boolean(),
  }),
  examples: z
    .object({
      preferredVisuals: z.array(z.string()).optional(),
      dislikedVisuals: z.array(z.string()).optional(),
    })
    .optional(),
});

export type BrandPackFormInput = z.infer<typeof brandPackSchema>;

// Re-export BrandPack type from database for convenience
export type { BrandPack } from '@/lib/types/database';

/**
 * Calculate Brand Pack completeness (0-100)
 */
export function calculateBrandPackCompleteness(pack: Partial<BrandPackFormInput>): number {
  let score = 0;
  const checks = [
    // Identity (30 points)
    { check: () => pack.identity?.mission && pack.identity.mission.length >= 10, points: 10 },
    { check: () => pack.identity?.audience && pack.identity.audience.length >= 5, points: 10 },
    { check: () => pack.identity?.brandPersonality && pack.identity.brandPersonality.length > 0, points: 10 },

    // Language Rules (20 points)
    { check: () => pack.languageRules?.toneConstraints !== undefined, points: 10 },
    { check: () => pack.languageRules?.forbiddenClaims !== undefined, points: 10 },

    // Visual Rules (30 points)
    { check: () => pack.visualRules?.stylePreferences && pack.visualRules.stylePreferences.length > 0, points: 10 },
    { check: () => pack.visualRules?.realismLevel !== undefined, points: 10 },
    { check: () => pack.visualRules?.colorMoodHints !== undefined, points: 10 },

    // AI Prompt Anchors (20 points)
    { check: () => pack.aiPromptAnchors?.imageSystemPrompt && pack.aiPromptAnchors.imageSystemPrompt.length >= 20, points: 10 },
    { check: () => pack.aiPromptAnchors?.imageStylePrompt && pack.aiPromptAnchors.imageStylePrompt.length >= 20, points: 10 },
  ];

  checks.forEach(({ check, points }) => {
    if (check()) score += points;
  });

  return score;
}

/**
 * Get default Brand Pack values based on governance profile
 */
export function getDefaultBrandPack(governanceProfile: 'strict' | 'standard' | 'experimental'): BrandPackFormInput {
  const base: BrandPackFormInput = {
    identity: {
      mission: '',
      audience: '',
      brandPersonality: ['authoritative'] as BrandPersonality[],
      riskTolerance: 'medium',
    },
    languageRules: {
      requiredCTA: false,
      requiredHashtags: false,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: {
        avoidSalesy: false,
        avoidHype: false,
        allowHumor: true,
      },
    },
    visualRules: {
      stylePreferences: ['photography'] as VisualStyle[],
      realismLevel: 'photorealistic',
      allowAIPeople: true,
      allowRealPeople: true,
      allowTextInImage: true,
      colorMoodHints: [],
      forbiddenVisualMotifs: [],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Generate professional marketing imagery that aligns with brand guidelines.',
      imageStylePrompt: 'Clean, modern, high-quality visual style.',
    },
    governanceOverrides: {
      requireVariantApproval: false,
      escalateVisualWarnings: false,
    },
  };

  if (governanceProfile === 'strict') {
    return {
      ...base,
      identity: { ...base.identity, riskTolerance: 'low' },
      languageRules: {
        ...base.languageRules,
        requiredCTA: true,
        requiredHashtags: true,
        forbiddenClaims: ['guaranteed', 'best', 'revolutionary', 'miracle'],
        forbiddenComparisons: true,
        toneConstraints: {
          avoidSalesy: true,
          avoidHype: true,
          allowHumor: false,
        },
      },
      visualRules: {
        ...base.visualRules,
        allowTextInImage: false,
        forbiddenVisualMotifs: ['fake testimonials', 'before/after', 'exaggerated results'],
      },
      governanceOverrides: {
        requireVariantApproval: true,
        escalateVisualWarnings: true,
      },
    };
  }

  if (governanceProfile === 'experimental') {
    return {
      ...base,
      identity: { ...base.identity, riskTolerance: 'high', brandPersonality: ['experimental', 'playful'] as BrandPersonality[] },
      languageRules: {
        ...base.languageRules,
        toneConstraints: {
          avoidSalesy: false,
          avoidHype: false,
          allowHumor: true,
        },
      },
      visualRules: {
        ...base.visualRules,
        stylePreferences: ['illustration', 'abstract'] as VisualStyle[],
        realismLevel: 'stylized',
      },
    };
  }

  return base;
}
