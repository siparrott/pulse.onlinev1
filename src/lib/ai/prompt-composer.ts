/**
 * AI Image Prompt Composition Engine
 * Assembles structured, brand-aware prompts for AI image generation
 * NEVER allows free-text prompts from users
 */

import type { BrandPack, ContentType } from '@/lib/types/database';

export interface PromptComponents {
  systemPrompt: string;
  stylePrompt: string;
  contextPrompt: string;
  safetyPrompt: string;
  fullPrompt: string;
  metadata: {
    brandPackId: string;
    brandPackVersion: string;
    channelCode: string;
    platformKey: string;
    targetAspect: string;
    composedAt: string;
  };
}

/**
 * Compose a complete AI image prompt from Brand Pack + post context
 * This is the ONLY way AI images can be generated
 */
export function composeImagePrompt(params: {
  brandPack: BrandPack;
  caption: string;
  theme: string | null;
  channelCode: string;
  platformKey: string;
  targetAspect: string;
  contentType: ContentType;
  userContext?: string;
}): PromptComponents {
  const { brandPack, caption, theme, channelCode, platformKey, targetAspect, contentType, userContext } = params;

  // 1) SYSTEM PROMPT - Brand identity and mission
  const systemPrompt = buildSystemPrompt(brandPack);

  // 2) STYLE PROMPT - Visual rules and aesthetic
  const stylePrompt = buildStylePrompt(brandPack);

  // 3) CONTEXT PROMPT - Post content and platform intent
  const contextPrompt = buildContextPrompt(caption, theme, platformKey, targetAspect, contentType, userContext);

  // 4) SAFETY PROMPT - Hard constraints
  const safetyPrompt = buildSafetyPrompt(brandPack);

  // Compose final prompt
  const fullPrompt = [systemPrompt, stylePrompt, contextPrompt, safetyPrompt]
    .filter(Boolean)
    .join('\n\n');

  return {
    systemPrompt,
    stylePrompt,
    contextPrompt,
    safetyPrompt,
    fullPrompt,
    metadata: {
      brandPackId: brandPack.id,
      brandPackVersion: hashBrandPack(brandPack),
      channelCode,
      platformKey,
      targetAspect,
      composedAt: new Date().toISOString(),
    },
  };
}

function buildSystemPrompt(brandPack: BrandPack): string {
  const { identity, aiPromptAnchors } = brandPack;

  const personalityStr = identity.brandPersonality.join(', ');
  const riskStr = identity.riskTolerance === 'low' ? 'conservative and safe' : 
                  identity.riskTolerance === 'high' ? 'bold and creative' : 'balanced';

  return `${aiPromptAnchors.imageSystemPrompt}

BRAND MISSION: ${identity.mission}
TARGET AUDIENCE: ${identity.audience}
BRAND PERSONALITY: ${personalityStr}
RISK APPROACH: ${riskStr}`;
}

function buildStylePrompt(brandPack: BrandPack): string {
  const { visualRules, aiPromptAnchors } = brandPack;

  const styleStr = visualRules.stylePreferences.join(', ');
  const moodStr = visualRules.colorMoodHints.length > 0 
    ? `Color mood: ${visualRules.colorMoodHints.join(', ')}` 
    : '';

  return `${aiPromptAnchors.imageStylePrompt}

VISUAL STYLE: ${styleStr}
REALISM LEVEL: ${visualRules.realismLevel}
${moodStr}`;
}

function buildContextPrompt(
  caption: string,
  theme: string | null,
  platformKey: string,
  targetAspect: string,
  contentType: ContentType,
  userContext?: string
): string {
  const platformIntent = getPlatformIntent(platformKey, targetAspect);
  const themeStr = theme ? `THEME: ${theme}` : '';

  // Extract key concepts from caption (first 200 chars)
  const captionSummary = caption.length > 200 ? caption.substring(0, 200) + '...' : caption;

  const userContextStr = userContext?.trim()
    ? `\nADDITIONAL CREATIVE DIRECTION: ${userContext.trim().substring(0, 500)}`
    : '';

  return `PLATFORM: ${platformIntent}
CONTENT TYPE: ${contentType}
${themeStr}

CAPTION CONTEXT: ${captionSummary}${userContextStr}`;
}

function buildSafetyPrompt(brandPack: BrandPack): string {
  const { visualRules } = brandPack;
  const constraints: string[] = [];

  if (!visualRules.allowTextInImage) {
    constraints.push('CRITICAL: Do not include any text, words, letters, or typography in the image');
  }

  if (!visualRules.allowAIPeople && !visualRules.allowRealPeople) {
    constraints.push('CRITICAL: Do not depict any human figures, faces, or people');
  } else if (!visualRules.allowRealPeople) {
    constraints.push('CRITICAL: Do not use photographs of real people. Illustrations or abstract representations only');
  }

  if (visualRules.forbiddenVisualMotifs.length > 0) {
    constraints.push(`FORBIDDEN MOTIFS: Avoid these visual elements: ${visualRules.forbiddenVisualMotifs.join(', ')}`);
  }

  constraints.push('Do not include logos, brand names, or watermarks unless explicitly provided');
  constraints.push('Ensure commercial use rights and avoid copyrighted elements');

  return `SAFETY CONSTRAINTS:\n${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
}

function getPlatformIntent(platformKey: string, targetAspect: string): string {
  const platformMap: Record<string, string> = {
    instagram_feed: 'Instagram feed post (4:5 vertical)',
    instagram_reels: 'Instagram Reels (9:16 vertical short-form)',
    x_twitter: 'Twitter/X timeline post (16:9 landscape)',
    linkedin: 'LinkedIn professional feed (1.91:1 landscape)',
    facebook: 'Facebook news feed (1.91:1 landscape)',
    tiktok: 'TikTok vertical feed (9:16 portrait)',
    youtube_thumbnail: 'YouTube video thumbnail (16:9 landscape)',
    pinterest: 'Pinterest pin (2:3 vertical)',
  };

  return platformMap[platformKey] || `${platformKey} (${targetAspect})`;
}

/**
 * Generate a version hash for Brand Pack to detect changes
 */
export function hashBrandPack(brandPack: Record<string, unknown> | BrandPack): string {
  const str = JSON.stringify(brandPack);

  // Simple hash (in production use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate that Brand Pack is complete enough for AI generation
 */
export function validateBrandPackForAI(brandPack: BrandPack | null): {
  valid: boolean;
  missingFields: string[];
  completeness: number;
} {
  if (!brandPack) {
    return {
      valid: false,
      missingFields: ['Brand Pack not configured'],
      completeness: 0,
    };
  }

  const missing: string[] = [];

  if (!brandPack.identity.mission || brandPack.identity.mission.length < 10) {
    missing.push('Brand mission');
  }
  if (!brandPack.identity.audience || brandPack.identity.audience.length < 5) {
    missing.push('Target audience');
  }
  if (brandPack.identity.brandPersonality.length === 0) {
    missing.push('Brand personality');
  }
  if (brandPack.visualRules.stylePreferences.length === 0) {
    missing.push('Visual style preferences');
  }
  if (!brandPack.aiPromptAnchors.imageSystemPrompt || brandPack.aiPromptAnchors.imageSystemPrompt.length < 20) {
    missing.push('AI system prompt anchor');
  }
  if (!brandPack.aiPromptAnchors.imageStylePrompt || brandPack.aiPromptAnchors.imageStylePrompt.length < 20) {
    missing.push('AI style prompt anchor');
  }

  const completeness = brandPack.completeness || 0;
  const valid = missing.length === 0 && completeness >= 70;

  return { valid, missingFields: missing, completeness };
}
