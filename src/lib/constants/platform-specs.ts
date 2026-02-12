/**
 * Platform-specific media specifications for aspect ratio validation
 * Phase 1: Detection and warnings only
 */

export type Platform = 
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'pinterest';

export type ContentType = 'reel' | 'static' | 'carousel' | 'text';

export interface AspectRatioWindow {
  min: number;
  max: number;
  label: string;
}

/**
 * Safe aspect ratio windows for platform feed previews
 * Images within these windows are unlikely to be cropped
 */
export const PLATFORM_ASPECT_RATIOS: Record<string, AspectRatioWindow> = {
  // Instagram feed: 4:5 to 1.91:1
  instagram_feed: {
    min: 0.80,
    max: 1.91,
    label: 'Instagram Feed (4:5 to 1.91:1)',
  },
  // Instagram Reels: 9:16 (vertical video)
  instagram_reels: {
    min: 0.55,
    max: 0.60,
    label: 'Instagram Reels (9:16)',
  },
  // TikTok: 9:16 (vertical video)
  tiktok: {
    min: 0.55,
    max: 0.60,
    label: 'TikTok (9:16)',
  },
  // Twitter/X: Close to 16:9
  x_twitter: {
    min: 1.70,
    max: 1.91,
    label: 'Twitter/X (16:9)',
  },
  // LinkedIn: Wider images
  linkedin: {
    min: 1.50,
    max: 1.91,
    label: 'LinkedIn (1.5:1 to 1.91:1)',
  },
  // Facebook: Similar to LinkedIn
  facebook: {
    min: 1.50,
    max: 1.91,
    label: 'Facebook (1.5:1 to 1.91:1)',
  },
  // YouTube thumbnails: 16:9
  youtube_thumbnail: {
    min: 1.70,
    max: 1.91,
    label: 'YouTube (16:9)',
  },
  // Pinterest: Tall pins (2:3)
  pinterest: {
    min: 0.60,
    max: 0.75,
    label: 'Pinterest (2:3)',
  },
};

/**
 * Maps platform names to spec keys based on content type
 */
export function getPlatformSpecKey(
  platform: Platform,
  contentType: ContentType
): string {
  // Instagram: use reels spec for reel content
  if (platform === 'instagram' && contentType === 'reel') {
    return 'instagram_reels';
  }
  if (platform === 'instagram') {
    return 'instagram_feed';
  }

  // Twitter
  if (platform === 'twitter') {
    return 'x_twitter';
  }

  // YouTube: thumbnails for static, unknown for video
  if (platform === 'youtube') {
    return 'youtube_thumbnail';
  }

  // Direct mapping for others
  return platform;
}

/**
 * Determines if an aspect ratio is safe for a given platform
 * Returns: 'ok' | 'warn' | 'unknown'
 */
export function checkAspectRatioSafety(
  aspectRatio: number | null,
  platform: Platform,
  contentType: ContentType
): 'ok' | 'warn' | 'unknown' {
  // Unknown aspect ratio (video without metadata)
  if (aspectRatio === null) {
    return 'unknown';
  }

  const specKey = getPlatformSpecKey(platform, contentType);
  const spec = PLATFORM_ASPECT_RATIOS[specKey];

  if (!spec) {
    return 'unknown';
  }

  // Check if ratio falls within safe window
  if (aspectRatio >= spec.min && aspectRatio <= spec.max) {
    return 'ok';
  }

  return 'warn';
}

/**
 * Analyzes all selected platforms for aspect ratio safety
 */
export function analyzePlatformRisks(
  aspectRatio: number | null,
  platforms: Platform[],
  contentType: ContentType
): Record<string, 'ok' | 'warn' | 'unknown'> {
  const risks: Record<string, 'ok' | 'warn' | 'unknown'> = {};

  for (const platform of platforms) {
    risks[platform] = checkAspectRatioSafety(aspectRatio, platform, contentType);
  }

  return risks;
}

/**
 * Gets human-readable description of a platform's aspect ratio requirements
 */
export function getPlatformAspectRatioLabel(
  platform: Platform,
  contentType: ContentType
): string {
  const specKey = getPlatformSpecKey(platform, contentType);
  const spec = PLATFORM_ASPECT_RATIOS[specKey];
  return spec?.label || 'Unknown';
}
