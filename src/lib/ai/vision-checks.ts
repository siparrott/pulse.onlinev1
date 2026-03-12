/**
 * Brand Pack Vision Checks
 * Server-side only — uses OpenAI vision (gpt-4o) to enforce Brand Pack visual rules.
 *
 * Called immediately AFTER image generation, BEFORE marking a variant as ready.
 * The verdict drives governance: BLOCK / WARN / OK depending on profile.
 */

import OpenAI from 'openai';
import type { BrandPack, GovernanceProfile } from '@/lib/types/database';
import type { AssetGovernanceIssue } from '@/lib/governance/asset-validator';

// ─── Types ──────────────────────────────────────────

export interface VisionVerdict {
  containsText: boolean;
  containsPeople: boolean;
  peopleType: 'unknown' | 'photo_real' | 'illustration' | 'none';
  containsLogosOrWatermarks: boolean;
  motifsDetected: string[];          // subset of forbiddenVisualMotifs found
  riskNotes: string[];               // free-form safety observations
  confidence: 'low' | 'medium' | 'high';
}

export interface VisionCheckInput {
  imageBase64: string;               // raw base64 (no data: prefix)
  imageMimeType: string;
  brandPack: BrandPack;
  platformKey: string;
  targetAspect: string;
  postCaption: string;
  channelCode: string;
}

export interface VisionGovernanceResult {
  verdict: VisionVerdict;
  issues: AssetGovernanceIssue[];
  overallStatus: 'ok' | 'warn' | 'blocked';
}

// ─── Main function ──────────────────────────────────

export async function runBrandPackVisionChecks(
  input: VisionCheckInput
): Promise<VisionGovernanceResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Cannot run vision without a key — return a low-confidence fallback
    return fallbackVerdict('OpenAI API key missing — vision checks skipped');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
  const { brandPack, postCaption } = input;

  // Build the analysis prompt
  const systemMessage = buildVisionSystemPrompt(brandPack);
  const userMessage = buildVisionUserPrompt(brandPack, postCaption);

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 800,
      temperature: 0.1,           // deterministic analysis
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemMessage },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.imageMimeType};base64,${input.imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) {
      return fallbackVerdict('Vision API returned empty response');
    }

    const parsed = parseVisionResponse(raw);
    const issues = applyBrandPackRules(parsed, brandPack, input.platformKey);
    const overallStatus = resolveOverallStatus(issues, brandPack);

    return { verdict: parsed, issues, overallStatus };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Vision check failed';
    console.error('Vision check error:', message);
    return fallbackVerdict(message);
  }
}

// ─── Prompt builders ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildVisionSystemPrompt(_brandPack: BrandPack): string {
  return `You are an internal brand-compliance image analyst for a governed publishing system.
Your job is to examine a generated marketing image and report ONLY factual observations.

RESPOND WITH VALID JSON ONLY matching this schema:
{
  "containsText": boolean,
  "containsPeople": boolean,
  "peopleType": "photo_real" | "illustration" | "none",
  "containsLogosOrWatermarks": boolean,
  "motifsDetected": string[],
  "riskNotes": string[],
  "confidence": "low" | "medium" | "high"
}

RULES:
- Be conservative: if unsure, set confidence to "low" and describe what you see in riskNotes.
- For motifsDetected, ONLY include items from the provided forbidden list that are genuinely present.
- Do not hallucinate motifs that are not clearly visible.
- "containsText" means any visible words, letters, numbers, or typography.
- "containsPeople" means any identifiable human figures, faces, or body parts.
- "peopleType" should be "photo_real" if they look like photographs of real people,
  "illustration" if they are drawn/stylized, or "none" if no people present.`;
}

function buildVisionUserPrompt(brandPack: BrandPack, postCaption: string): string {
  const { visualRules } = brandPack;

  const rules = [
    `allowTextInImage: ${visualRules.allowTextInImage}`,
    `allowAIPeople: ${visualRules.allowAIPeople}`,
    `allowRealPeople: ${visualRules.allowRealPeople}`,
  ];

  const motifs = visualRules.forbiddenVisualMotifs.length > 0
    ? `Forbidden visual motifs to check: ${JSON.stringify(visualRules.forbiddenVisualMotifs)}`
    : 'No specific forbidden motifs configured.';

  return `Analyze this AI-generated marketing image.

BRAND PACK RULES:
${rules.join('\n')}
${motifs}

POST CAPTION CONTEXT:
"${postCaption.slice(0, 200)}"

Return your JSON analysis.`;
}

// ─── Response parsing ───────────────────────────────

function parseVisionResponse(raw: string): VisionVerdict {
  try {
    const json = JSON.parse(raw);
    return {
      containsText: Boolean(json.containsText),
      containsPeople: Boolean(json.containsPeople),
      peopleType: (['photo_real', 'illustration', 'none'] as const).includes(json.peopleType)
        ? json.peopleType
        : 'unknown',
      containsLogosOrWatermarks: Boolean(json.containsLogosOrWatermarks),
      motifsDetected: Array.isArray(json.motifsDetected)
        ? json.motifsDetected.filter((m: unknown) => typeof m === 'string')
        : [],
      riskNotes: Array.isArray(json.riskNotes)
        ? json.riskNotes.filter((n: unknown) => typeof n === 'string')
        : [],
      confidence: (['low', 'medium', 'high'] as const).includes(json.confidence)
        ? json.confidence
        : 'low',
    };
  } catch {
    return {
      containsText: false,
      containsPeople: false,
      peopleType: 'unknown',
      containsLogosOrWatermarks: false,
      motifsDetected: [],
      riskNotes: ['Failed to parse vision response JSON'],
      confidence: 'low',
    };
  }
}

// ─── Rule enforcement ───────────────────────────────

export function applyBrandPackRules(
  verdict: VisionVerdict,
  brandPack: BrandPack,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _platformKey: string
): AssetGovernanceIssue[] {
  const issues: AssetGovernanceIssue[] = [];
  const { visualRules } = brandPack;

  // 1) Text in image
  if (!visualRules.allowTextInImage && verdict.containsText) {
    issues.push({
      severity: 'error',
      code: 'vision_text_detected',
      message: 'Text detected in image but Brand Pack forbids text in images',
      fix: "Regenerate with 'no text' constraint",
    });
  }

  // 2) People in image
  if (verdict.containsPeople) {
    const isReal = verdict.peopleType === 'photo_real';
    const isIllustration = verdict.peopleType === 'illustration';

    if (!visualRules.allowAIPeople && !visualRules.allowRealPeople) {
      // No people at all
      issues.push({
        severity: 'error',
        code: 'vision_people_detected',
        message: 'People detected in image but Brand Pack forbids all people',
        fix: "Regenerate with 'no people' constraint",
      });
    } else if (!visualRules.allowRealPeople && isReal) {
      issues.push({
        severity: 'error',
        code: 'vision_real_people_detected',
        message: 'Photorealistic people detected but Brand Pack only allows illustrated people',
        fix: "Regenerate with 'no people' constraint",
      });
    } else if (!visualRules.allowAIPeople && isIllustration) {
      issues.push({
        severity: 'error',
        code: 'vision_ai_people_detected',
        message: 'Illustrated people detected but Brand Pack only allows real photos',
        fix: "Regenerate with 'no people' constraint",
      });
    }
  }

  // 3) Forbidden motifs
  if (verdict.motifsDetected.length > 0) {
    issues.push({
      severity: 'error',
      code: 'vision_forbidden_motif',
      message: `Forbidden motifs detected: ${verdict.motifsDetected.join(', ')}`,
      fix: 'Regenerate image with adjusted prompts or update Brand Pack forbidden motifs',
    });
  }

  // 4) Logos / watermarks (always warn)
  if (verdict.containsLogosOrWatermarks) {
    issues.push({
      severity: 'warn',
      code: 'vision_logos_detected',
      message: 'Logos or watermarks detected in generated image',
      fix: 'Regenerate image — AI should not produce logos or watermarks',
    });
  }

  // 5) Low confidence caveat
  if (verdict.confidence === 'low' && issues.length > 0) {
    issues.push({
      severity: 'warn',
      code: 'vision_low_confidence',
      message: 'Vision analysis confidence is low — manual review recommended',
      fix: 'Review the image manually before publishing',
    });
  }

  return issues;
}

// ─── Governance resolution ──────────────────────────

/**
 * Resolve overall governance status from vision issues + governance profile.
 *
 * STRICT:       errors → blocked; any issue → warn
 * STANDARD:     errors → warn (unless multiple); no errors → ok
 * EXPERIMENTAL: errors → warn; only block on 3+ errors
 */
export function resolveOverallStatus(
  issues: AssetGovernanceIssue[],
  brandPack: BrandPack
): 'ok' | 'warn' | 'blocked' {
  if (issues.length === 0) return 'ok';

  const errors = issues.filter((i) => i.severity === 'error');
  const profile = resolveGovernanceProfile(brandPack);

  switch (profile) {
    case 'strict':
      // Low-confidence issues should not hard-block in strict either
      if (errors.length > 0) {
        // But if ALL errors are from low-confidence detection, warn instead
        const lowConfidence = issues.some((i) => i.code === 'vision_low_confidence');
        if (lowConfidence && errors.length === 1) return 'warn';
        return 'blocked';
      }
      return 'warn';

    case 'standard':
      if (errors.length >= 2) return 'blocked';
      if (errors.length === 1) return 'warn';
      return 'warn';

    case 'experimental':
      if (errors.length >= 3) return 'blocked';
      if (errors.length > 0) return 'warn';
      return 'ok';

    default:
      return errors.length > 0 ? 'warn' : 'ok';
  }
}

function resolveGovernanceProfile(brandPack: BrandPack): GovernanceProfile {
  // Derive from risk tolerance as a proxy
  const risk = brandPack.identity.riskTolerance;
  if (risk === 'low') return 'strict';
  if (risk === 'high') return 'experimental';
  return 'standard';
}

// ─── Fallback ───────────────────────────────────────

function fallbackVerdict(reason: string): VisionGovernanceResult {
  return {
    verdict: {
      containsText: false,
      containsPeople: false,
      peopleType: 'unknown',
      containsLogosOrWatermarks: false,
      motifsDetected: [],
      riskNotes: [reason],
      confidence: 'low',
    },
    issues: [
      {
        severity: 'warn',
        code: 'vision_unavailable',
        message: `Vision checks unavailable: ${reason}`,
        fix: 'Review the image manually before publishing',
      },
    ],
    overallStatus: 'warn',
  };
}
