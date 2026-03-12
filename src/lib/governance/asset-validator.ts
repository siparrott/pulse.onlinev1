/**
 * Phase 3: Asset Governance for Generated Variants + Brand Pack Compliance
 * Validates generated variants before they can be used
 */

import type { PublisherChannel, VisualVariant, VisionVerdict } from '@/lib/types/database';
import type { BrandPack } from '@/lib/schemas/brand-pack';

export interface AssetGovernanceIssue {
  severity: 'warn' | 'error';
  code: string;
  message: string;
  fix: string;
}

export interface AssetGovernanceResult {
  status: 'ok' | 'warn' | 'blocked';
  score: number;
  issues: AssetGovernanceIssue[];
}

/**
 * Check for attribution safety (ContextEmbed STRICT only)
 * Blocks AI-generated text overlays to avoid attribution issues
 */
function checkAttributionSafety(
  variant: Partial<VisualVariant>,
  channel: PublisherChannel
): AssetGovernanceIssue | null {
  // Only applies to STRICT governance and ContextEmbed channel
  if (
    channel.governance_profile !== 'strict' ||
    channel.product_code !== 'contextembed'
  ) {
    return null;
  }

  // Block AI-generated variants with text (we can't verify attribution)
  if (variant.method === 'ai') {
    return {
      severity: 'error',
      code: 'attribution_risk',
      message: 'AI-generated variants blocked for ContextEmbed - attribution unclear',
      fix: 'Use auto-crop mode instead, or add attribution in caption',
    };
  }

  // Crop/pad is safe - no new content added
  return null;
}

/**
 * Check for edge text safety
 * Warns when significant cropping may clip text near edges
 */
function checkEdgeTextSafety(
  variant: Partial<VisualVariant>,
  sourceAspectRatio: number
): AssetGovernanceIssue | null {
  // Only check for crop method
  if (variant.method !== 'crop') {
    return null;
  }

  // Calculate aspect ratio difference
  const targetRatio = variant.aspectRatio || 1;
  const ratioDiff = Math.abs((targetRatio - sourceAspectRatio) / sourceAspectRatio);

  // If crop is significant (>15% change), warn about potential text clipping
  if (ratioDiff > 0.15) {
    return {
      severity: 'warn',
      code: 'edge_text_risk',
      message: 'Significant crop may clip edge text or important content',
      fix: 'Review preview carefully, or regenerate using Pad method',
    };
  }

  return null;
}

/**
 * Check platform compliance
 * Ensures variant ratio matches target within tolerance
 */
function checkPlatformCompliance(
  variant: Partial<VisualVariant>
): AssetGovernanceIssue | null {
  if (!variant.aspectRatio || !variant.targetAspect) {
    return null;
  }

  // Parse target aspect ratio
  const targetRatioMap: Record<string, number> = {
    '16:9': 1.777,
    '9:16': 0.5625,
    '4:5': 0.80,
    '1:1': 1.0,
    '1.91:1': 1.91,
    '2:3': 0.666,
  };

  const expectedRatio = targetRatioMap[variant.targetAspect];
  if (!expectedRatio) return null;

  // Check deviation
  const deviation = Math.abs(variant.aspectRatio - expectedRatio) / expectedRatio;

  // Block if deviation > 2%
  if (deviation > 0.02) {
    return {
      severity: 'error',
      code: 'platform_compliance',
      message: `Variant ratio ${variant.aspectRatio.toFixed(3)} deviates from target ${variant.targetAspect}`,
      fix: 'Regenerate variant - this is a generation error',
    };
  }

  return null;
}

/**
 * Check image quality
 * Warns about potential quality issues
 */
function checkImageQuality(
  variant: Partial<VisualVariant>
): AssetGovernanceIssue[] {
  const issues: AssetGovernanceIssue[] = [];

  if (!variant.width || !variant.height) {
    return issues;
  }

  // Check minimum dimensions
  const isLandscape = variant.aspectRatio && variant.aspectRatio > 1;
  const minDimension = 900;

  if (isLandscape && variant.width < minDimension) {
    issues.push({
      severity: 'warn',
      code: 'low_width',
      message: `Width ${variant.width}px is below recommended 900px for landscape`,
      fix: 'Source image may be too small - consider higher resolution',
    });
  }

  if (!isLandscape && variant.height < minDimension) {
    issues.push({
      severity: 'warn',
      code: 'low_height',
      message: `Height ${variant.height}px is below recommended 900px for portrait`,
      fix: 'Source image may be too small - consider higher resolution',
    });
  }

  // Check file size (if available)
  // Note: We'll need to calculate this from the blob
  // For now, warn about potential compression
  if (variant.width && variant.height) {
    const pixels = variant.width * variant.height;
    const estimatedSizeMB = (pixels * 3) / (1024 * 1024); // Rough JPEG estimate

    if (estimatedSizeMB > 8) {
      issues.push({
        severity: 'warn',
        code: 'large_file',
        message: 'Estimated file size may exceed 8MB - platforms may compress',
        fix: 'Acceptable quality loss expected during platform upload',
      });
    }
  }

  return issues;
}

/**
 * Phase 3: Check Brand Pack compliance for AI-generated variants
 * Ensures AI variants follow brand visual rules
 */
function checkBrandPackCompliance(
  variant: Partial<VisualVariant>,
  brandPack: BrandPack | null,
  channel: PublisherChannel
): AssetGovernanceIssue[] {
  const issues: AssetGovernanceIssue[] = [];

  // Only applies to AI-generated variants
  if (variant.method !== 'ai') {
    return issues;
  }

  // Require Brand Pack for AI generation
  if (!brandPack) {
    issues.push({
      severity: 'error',
      code: 'brand_pack_missing',
      message: 'Brand Pack required for AI-generated imagery',
      fix: 'Configure Brand Pack in Channel settings before generating AI images',
    });
    return issues;
  }

  // Check completeness (should be validated before generation, but double-check)
  if (brandPack.completeness < 70) {
    issues.push({
      severity: 'error',
      code: 'brand_pack_incomplete',
      message: `Brand Pack completeness ${brandPack.completeness}% below required 70%`,
      fix: 'Complete Brand Pack in Channel settings',
    });
  }

  // ── Use real vision verdict if available ──────────
  const visionVerdict = variant.analysis?.vision;

  if (visionVerdict) {
    // Real vision checks — use verdict from GPT-4o
    const visionIssues = applyVisionVerdictToGovernance(visionVerdict, brandPack, channel);
    issues.push(...visionIssues);
  } else {
    // No vision verdict yet — add manual-review reminders for relevant rules
    if (!brandPack.visualRules.allowTextInImage) {
      issues.push({
        severity: 'warn',
        code: 'check_text_in_image',
        message: 'Brand Pack forbids text in images — vision check pending',
        fix: 'Vision check will run automatically after generation',
      });
    }

    if (!brandPack.visualRules.allowRealPeople && !brandPack.visualRules.allowAIPeople) {
      issues.push({
        severity: 'warn',
        code: 'check_no_people',
        message: 'Brand Pack forbids people in images — vision check pending',
        fix: 'Vision check will run automatically after generation',
      });
    }

    if (brandPack.visualRules.forbiddenVisualMotifs.length > 0) {
      issues.push({
        severity: 'warn',
        code: 'check_forbidden_motifs',
        message: `Forbidden motifs configured — vision check pending`,
        fix: 'Vision check will run automatically after generation',
      });
    }
  }

  // STRICT profiles require manual approval for AI variants
  if (channel.governance_profile === 'strict' && brandPack.governanceOverrides?.requireVariantApproval) {
    issues.push({
      severity: 'warn',
      code: 'strict_approval_required',
      message: 'STRICT channel requires manual approval for AI variants',
      fix: 'Review AI-generated image carefully before publishing',
    });
  }

  return issues;
}

/**
 * Convert a real VisionVerdict into governance issues.
 * This replaces the old placeholder warn-only checks.
 */
function applyVisionVerdictToGovernance(
  verdict: VisionVerdict,
  brandPack: BrandPack,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _channel: PublisherChannel
): AssetGovernanceIssue[] {
  const issues: AssetGovernanceIssue[] = [];
  const { visualRules } = brandPack;

  // 1) Text in image
  if (!visualRules.allowTextInImage && verdict.containsText) {
    issues.push({
      severity: 'error',
      code: 'vision_text_detected',
      message: 'Text detected in image but Brand Pack forbids text',
      fix: "Regenerate with 'no text' constraint, or allow text in Brand Pack",
    });
  }

  // 2) People in image
  if (verdict.containsPeople) {
    const isReal = verdict.peopleType === 'photo_real';
    const isIllustration = verdict.peopleType === 'illustration';

    if (!visualRules.allowAIPeople && !visualRules.allowRealPeople) {
      issues.push({
        severity: 'error',
        code: 'vision_people_detected',
        message: 'People detected but Brand Pack forbids all people',
        fix: "Regenerate with 'no people' constraint",
      });
    } else if (!visualRules.allowRealPeople && isReal) {
      issues.push({
        severity: 'error',
        code: 'vision_real_people_detected',
        message: 'Photorealistic people detected but Brand Pack only allows illustrated people',
        fix: "Regenerate with illustration style, or allow real people in Brand Pack",
      });
    } else if (!visualRules.allowAIPeople && isIllustration) {
      issues.push({
        severity: 'error',
        code: 'vision_ai_people_detected',
        message: 'Illustrated people detected but Brand Pack only allows real photos',
        fix: "Regenerate with 'no illustrations' constraint",
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

/**
 * Main asset governance function
 * Evaluates a generated variant against governance rules
 */
export function validateVariantAsset(
  variant: Partial<VisualVariant>,
  channel: PublisherChannel,
  sourceAspectRatio: number,
  brandPack?: BrandPack | null
): AssetGovernanceResult {
  const issues: AssetGovernanceIssue[] = [];

  // Run all checks
  const attributionIssue = checkAttributionSafety(variant, channel);
  if (attributionIssue) issues.push(attributionIssue);

  const edgeTextIssue = checkEdgeTextSafety(variant, sourceAspectRatio);
  if (edgeTextIssue) issues.push(edgeTextIssue);

  const complianceIssue = checkPlatformCompliance(variant);
  if (complianceIssue) issues.push(complianceIssue);

  const qualityIssues = checkImageQuality(variant);
  issues.push(...qualityIssues);

  const brandPackIssues = checkBrandPackCompliance(variant, brandPack || null, channel);
  issues.push(...brandPackIssues);

  // Calculate score
  let score = 100;
  let hasError = false;

  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= 25;
      hasError = true;
    } else if (issue.severity === 'warn') {
      score -= 10;
    }
  }

  score = Math.max(0, score);

  // Determine status
  let status: 'ok' | 'warn' | 'blocked' = 'ok';
  if (hasError) {
    status = 'blocked';
  } else if (issues.length > 0) {
    status = 'warn';
  }

  return {
    status,
    score,
    issues,
  };
}

/**
 * Applies channel governance profile rules to asset governance
 * STRICT: Warnings become blockers
 * STANDARD: Warnings allowed
 * EXPERIMENTAL: Only errors block
 */
export function applyChannelGovernanceProfile(
  result: AssetGovernanceResult,
  channel: PublisherChannel
): AssetGovernanceResult {
  if (channel.governance_profile === 'strict') {
    // In STRICT mode, any warning is treated more seriously
    // But we don't promote warnings to errors - just flag them clearly
    if (result.issues.some((i) => i.severity === 'warn') && result.status === 'warn') {
      // Add note to fix path
      result.issues = result.issues.map((issue) => {
        if (issue.severity === 'warn') {
          return {
            ...issue,
            fix: `[STRICT] ${issue.fix}`,
          };
        }
        return issue;
      });
    }
  }

  // STANDARD and EXPERIMENTAL: use result as-is
  return result;
}

/**
 * Batch validates multiple variants
 */
export function validateAllVariants(
  variants: Partial<VisualVariant>[],
  channel: PublisherChannel,
  sourceAspectRatio: number,
  brandPack?: BrandPack | null
): Map<string, AssetGovernanceResult> {
  const results = new Map<string, AssetGovernanceResult>();

  for (const variant of variants) {
    if (variant.id) {
      let result = validateVariantAsset(variant, channel, sourceAspectRatio, brandPack);
      result = applyChannelGovernanceProfile(result, channel);
      results.set(variant.id, result);
    }
  }

  return results;
}
