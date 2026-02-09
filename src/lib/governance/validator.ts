import type {
  PublisherPost,
  PublisherChannel,
  GovernanceRefusal,
  GovernanceStatus,
  AssetRequirements,
  PublisherAsset,
} from '@/lib/types/database';

export interface GovernanceResult {
  status: GovernanceStatus;
  score: number;
  refusals: GovernanceRefusal[];
  unlock_path: string | null;
}

// Hype/overclaim patterns to detect
const HYPE_PATTERNS = [
  /\b(guaranteed|guarantee)\b/i,
  /\b(100%|hundred percent)\b/i,
  /\b(never fail|can't fail|won't fail)\b/i,
  /\b(best in the world|#1|number one)\b/i,
  /\b(revolutionary|game.?changer)\b/i,
  /\b(miracle|magic|instant results)\b/i,
  /\b(get rich|make money fast)\b/i,
  /\b(limited time only|act now|don't miss)\b/i,
  /\b(secret|they don't want you to know)\b/i,
];

const COMPARISON_PATTERNS = [
  /\b(better than|superior to|beats)\b/i,
  /\b(unlike|compared to)\s+[A-Z]/i, // Comparison to named competitors
  /\b(competitor|competition)\b/i,
];

const SPAM_PATTERNS = [
  /\b(free money|click here|buy now)\b/i,
  /\b(DM me|message me for)\b/i,
  /\$\$\$+/,
  /🔥{3,}|💰{3,}|🚀{3,}/, // Excessive emoji spam
];

const SCAM_PATTERNS = [
  /\b(crypto|nft|blockchain).*(invest|opportunity)/i,
  /\b(passive income|financial freedom)\b/i,
  /\b(pyramid|mlm|multi.?level)\b/i,
];

function checkHypePatterns(caption: string): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  for (const pattern of HYPE_PATTERNS) {
    if (pattern.test(caption)) {
      refusals.push({
        rule: 'no_hype',
        message: `Hype language detected: "${caption.match(pattern)?.[0]}"`,
        severity: 'error',
      });
    }
  }
  
  return refusals;
}

function checkComparisonPatterns(caption: string): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  for (const pattern of COMPARISON_PATTERNS) {
    if (pattern.test(caption)) {
      refusals.push({
        rule: 'no_unproven_comparisons',
        message: `Comparison without proof detected. Add proof asset or rephrase.`,
        severity: 'error',
      });
    }
  }
  
  return refusals;
}

function checkSpamPatterns(caption: string): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(caption)) {
      refusals.push({
        rule: 'no_spam',
        message: `Spam-like language detected`,
        severity: 'error',
      });
    }
  }
  
  return refusals;
}

function checkScamPatterns(caption: string): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(caption)) {
      refusals.push({
        rule: 'no_scams',
        message: `Potential scam language detected`,
        severity: 'error',
      });
    }
  }
  
  return refusals;
}

function checkCTARequired(post: PublisherPost): GovernanceRefusal | null {
  if (!post.cta || post.cta.trim().length === 0) {
    return {
      rule: 'cta_required',
      message: 'CTA (Call to Action) is required for this channel',
      severity: 'error',
    };
  }
  return null;
}

function checkHashtagsRequired(post: PublisherPost): GovernanceRefusal | null {
  if (!post.hashtags || post.hashtags.trim().length === 0) {
    return {
      rule: 'hashtags_required',
      message: 'Hashtags are required for this channel',
      severity: 'error',
    };
  }
  return null;
}

function checkImageRequired(
  post: PublisherPost,
  requirements: AssetRequirements,
  assets: PublisherAsset[]
): GovernanceRefusal | null {
  const needsImage =
    (post.content_type === 'static' && requirements.static_requires_image) ||
    (post.content_type === 'carousel' && requirements.carousel_requires_image);
    
  if (needsImage && assets.length === 0) {
    return {
      rule: 'image_required',
      message: `Image is required for ${post.content_type} content type`,
      severity: 'error',
    };
  }
  
  return null;
}

function checkImageRecommended(
  post: PublisherPost,
  requirements: AssetRequirements,
  assets: PublisherAsset[]
): GovernanceRefusal | null {
  if (
    requirements.image_recommended &&
    (post.content_type === 'static' || post.content_type === 'carousel') &&
    assets.length === 0
  ) {
    return {
      rule: 'image_recommended',
      message: 'Image is recommended for better engagement',
      severity: 'warning',
    };
  }
  return null;
}

function validateStrict(
  post: PublisherPost,
  channel: PublisherChannel,
  assets: PublisherAsset[]
): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  // Check all strict rules
  refusals.push(...checkHypePatterns(post.caption));
  refusals.push(...checkComparisonPatterns(post.caption));
  refusals.push(...checkSpamPatterns(post.caption));
  refusals.push(...checkScamPatterns(post.caption));
  
  // CTA and hashtags required
  const ctaRefusal = checkCTARequired(post);
  if (ctaRefusal) refusals.push(ctaRefusal);
  
  const hashtagRefusal = checkHashtagsRequired(post);
  if (hashtagRefusal) refusals.push(hashtagRefusal);
  
  // Image requirements
  const imageRefusal = checkImageRequired(post, channel.asset_requirements, assets);
  if (imageRefusal) refusals.push(imageRefusal);
  
  return refusals;
}

function validateStandard(
  post: PublisherPost,
  channel: PublisherChannel,
  assets: PublisherAsset[]
): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  // Standard is softer - no hype check, but still no spam/scams
  refusals.push(...checkSpamPatterns(post.caption));
  refusals.push(...checkScamPatterns(post.caption));
  
  // Benefits language ok, but check for guarantees
  if (/\b(guaranteed|guarantee)\b/i.test(post.caption)) {
    refusals.push({
      rule: 'no_guarantees',
      message: 'Avoid guarantee language - use "designed to" or "helps with"',
      severity: 'warning',
    });
  }
  
  // Image recommended check
  const imageRecommended = checkImageRecommended(post, channel.asset_requirements, assets);
  if (imageRecommended) refusals.push(imageRecommended);
  
  return refusals;
}

function validateExperimental(
  post: PublisherPost,
  _channel: PublisherChannel,
  _assets: PublisherAsset[]
): GovernanceRefusal[] {
  const refusals: GovernanceRefusal[] = [];
  
  // Experimental - only block spam and scams
  refusals.push(...checkSpamPatterns(post.caption));
  refusals.push(...checkScamPatterns(post.caption));
  
  return refusals;
}

function calculateScore(refusals: GovernanceRefusal[]): number {
  // Start at 100, deduct for issues
  let score = 100;
  
  for (const refusal of refusals) {
    if (refusal.severity === 'error') {
      score -= 25;
    } else if (refusal.severity === 'warning') {
      score -= 10;
    }
  }
  
  return Math.max(0, score);
}

function determineStatus(refusals: GovernanceRefusal[]): GovernanceStatus {
  const hasErrors = refusals.some((r) => r.severity === 'error');
  const hasWarnings = refusals.some((r) => r.severity === 'warning');
  
  if (hasErrors) return 'blocked';
  if (hasWarnings) return 'allowed_with_edits';
  return 'allowed';
}

function generateUnlockPath(refusals: GovernanceRefusal[]): string | null {
  if (refusals.length === 0) return null;
  
  const fixes = refusals.map((r) => {
    switch (r.rule) {
      case 'no_hype':
        return 'Remove hype language and use factual statements';
      case 'no_unproven_comparisons':
        return 'Add proof asset or remove comparison claims';
      case 'cta_required':
        return 'Add a clear call-to-action';
      case 'hashtags_required':
        return 'Add relevant hashtags';
      case 'image_required':
        return 'Upload required image asset';
      case 'image_recommended':
        return 'Consider adding an image for better engagement';
      case 'no_guarantees':
        return 'Replace guarantee language with softer alternatives';
      default:
        return r.message;
    }
  });
  
  return [...new Set(fixes)].join('; ');
}

export function validatePost(
  post: PublisherPost,
  channel: PublisherChannel,
  assets: PublisherAsset[] = []
): GovernanceResult {
  let refusals: GovernanceRefusal[];
  
  switch (channel.governance_profile) {
    case 'strict':
      refusals = validateStrict(post, channel, assets);
      break;
    case 'standard':
      refusals = validateStandard(post, channel, assets);
      break;
    case 'experimental':
      refusals = validateExperimental(post, channel, assets);
      break;
    default:
      refusals = validateStrict(post, channel, assets);
  }
  
  return {
    status: determineStatus(refusals),
    score: calculateScore(refusals),
    refusals,
    unlock_path: generateUnlockPath(refusals),
  };
}

// Export patterns for testing
export const patterns = {
  HYPE_PATTERNS,
  COMPARISON_PATTERNS,
  SPAM_PATTERNS,
  SCAM_PATTERNS,
};
