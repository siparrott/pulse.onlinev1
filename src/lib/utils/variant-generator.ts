/**
 * Phase 2: Visual variant generation utility
 * Canvas-based image cropping and padding for platform-specific variants
 */

import type { Platform, ContentType } from '@/lib/types/database';

export interface VariantTarget {
  platformKey: string;
  targetAspect: string;
  targetRatio: number;
}

export interface GeneratedVariant {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  fileName: string;
  mimeType: string;
  method: 'crop' | 'pad';
}

/**
 * Platform-specific target aspect ratios for variant generation
 * Uses best-practice ratios for each platform
 */
export const PLATFORM_VARIANT_TARGETS: Record<string, { ratio: number; label: string }> = {
  instagram_feed: { ratio: 0.80, label: '4:5' }, // 4:5 for best feed performance
  instagram_reels: { ratio: 0.5625, label: '9:16' },
  tiktok: { ratio: 0.5625, label: '9:16' },
  x_twitter: { ratio: 1.777, label: '16:9' },
  linkedin: { ratio: 1.91, label: '1.91:1' },
  facebook: { ratio: 1.91, label: '1.91:1' },
  youtube_thumbnail: { ratio: 1.777, label: '16:9' },
  pinterest: { ratio: 0.666, label: '2:3' },
};

/**
 * Maps platform name to variant target key based on content type
 */
export function getPlatformVariantKey(
  platform: Platform,
  contentType: ContentType
): string {
  if (platform === 'instagram' && contentType === 'reel') {
    return 'instagram_reels';
  }
  if (platform === 'instagram') {
    return 'instagram_feed';
  }
  if (platform === 'twitter') {
    return 'x_twitter';
  }
  if (platform === 'youtube') {
    return 'youtube_thumbnail';
  }
  return platform;
}

/**
 * Gets all unique variant targets for selected platforms
 * Groups platforms by identical target ratios to avoid duplicate generation
 */
export function getVariantTargets(
  platforms: Platform[],
  contentType: ContentType
): VariantTarget[] {
  const targets: VariantTarget[] = [];
  const seenRatios = new Set<number>();

  for (const platform of platforms) {
    const platformKey = getPlatformVariantKey(platform, contentType);
    const target = PLATFORM_VARIANT_TARGETS[platformKey];

    if (!target) continue;

    // Only add if we haven't seen this ratio yet
    if (!seenRatios.has(target.ratio)) {
      seenRatios.add(target.ratio);
      targets.push({
        platformKey,
        targetAspect: target.label,
        targetRatio: target.ratio,
      });
    }
  }

  return targets;
}

/**
 * Determines optimal dimensions for a variant
 * Maintains quality while respecting max dimensions
 */
function calculateTargetDimensions(
  targetRatio: number,
  isPortrait: boolean
): { width: number; height: number } {
  const maxLandscape = 1600;
  const maxPortrait = 1080;

  if (isPortrait || targetRatio < 1) {
    // Portrait or square-ish
    const height = maxPortrait;
    const width = Math.round(height * targetRatio);
    return { width, height };
  } else {
    // Landscape
    const width = maxLandscape;
    const height = Math.round(width / targetRatio);
    return { width, height };
  }
}

/**
 * Determines whether to crop or pad based on source/target ratios
 * Always prefer pad to avoid governance warnings and content loss
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function determineMethod(_sourceRatio: number, _targetRatio: number): 'crop' | 'pad' {
  // Always use pad to preserve all content and avoid edge text safety warnings
  // This ensures variants pass governance checks (status === 'ok')
  return 'pad';
}

/**
 * Generates a cropped variant from source image
 * Uses center crop by default
 */
async function generateCroppedVariant(
  sourceImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  targetRatio: number,
  fileName: string
): Promise<GeneratedVariant> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Calculate crop dimensions
  const sourceRatio = sourceImage.width / sourceImage.height;
  let cropWidth = sourceImage.width;
  let cropHeight = sourceImage.height;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    // Source is wider - crop sides
    cropWidth = sourceImage.height * targetRatio;
    cropX = (sourceImage.width - cropWidth) / 2;
  } else {
    // Source is taller - crop top/bottom
    cropHeight = sourceImage.width / targetRatio;
    cropY = (sourceImage.height - cropHeight) / 2;
  }

  // Draw cropped image
  ctx.drawImage(
    sourceImage,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, targetWidth, targetHeight
  );

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.92);
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    blob,
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    aspectRatio: targetRatio,
    fileName,
    mimeType: 'image/jpeg',
    method: 'crop',
  };
}

/**
 * Generates a padded variant from source image
 * Adds letterboxing/pillarboxing to fit target ratio
 */
async function generatePaddedVariant(
  sourceImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  targetRatio: number,
  fileName: string
): Promise<GeneratedVariant> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Fill with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Calculate scaled dimensions to fit
  const sourceRatio = sourceImage.width / sourceImage.height;
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let drawX = 0;
  let drawY = 0;

  if (sourceRatio > targetRatio) {
    // Source is wider - fit width, pad top/bottom
    drawHeight = drawWidth / sourceRatio;
    drawY = (targetHeight - drawHeight) / 2;
  } else {
    // Source is taller - fit height, pad sides
    drawWidth = drawHeight * sourceRatio;
    drawX = (targetWidth - drawWidth) / 2;
  }

  // Draw centered image
  ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.92);
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    blob,
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    aspectRatio: targetRatio,
    fileName,
    mimeType: 'image/jpeg',
    method: 'pad',
  };
}

/**
 * Main variant generation function
 * Generates a platform-specific variant from source image
 */
export async function generateImageVariant(
  sourceFile: File | string,
  target: VariantTarget,
  postId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _sourceAssetId: string
): Promise<GeneratedVariant> {
  // Load source image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load source image'));

    if (typeof sourceFile === 'string') {
      img.src = sourceFile;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(sourceFile);
    }
  });

  // Calculate target dimensions
  const targetIsPortrait = target.targetRatio < 1;
  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    target.targetRatio,
    targetIsPortrait
  );

  // Determine method
  const sourceRatio = img.width / img.height;
  const method = determineMethod(sourceRatio, target.targetRatio);

  // Generate file name
  const fileName = `${postId}_${target.platformKey}_${target.targetAspect.replace(/[/:]/g, '-')}_${method}.jpg`;

  // Generate variant
  if (method === 'crop') {
    return generateCroppedVariant(img, targetWidth, targetHeight, target.targetRatio, fileName);
  } else {
    return generatePaddedVariant(img, targetWidth, targetHeight, target.targetRatio, fileName);
  }
}

/**
 * Batch generates variants for all platform targets
 */
export async function generateAllVariants(
  sourceFile: File | string,
  targets: VariantTarget[],
  postId: string,
  sourceAssetId: string,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedVariant[]> {
  const variants: GeneratedVariant[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      const variant = await generateImageVariant(sourceFile, target, postId, sourceAssetId);
      variants.push(variant);
      onProgress?.(i + 1, targets.length);
    } catch (error) {
      console.error(`Failed to generate variant for ${target.platformKey}:`, error);
      // Continue with other variants
    }
  }

  return variants;
}
