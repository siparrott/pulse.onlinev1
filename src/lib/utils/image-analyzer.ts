/**
 * Image analysis utilities for aspect ratio detection
 * Phase 1: Client-side dimension extraction
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Extracts dimensions from an image file or data URL
 * Works with base64 data URLs (client-side) and remote URLs
 */
export async function getImageDimensions(
  source: string | File
): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;

      resolve({ width, height, aspectRatio });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Handle File objects vs strings
    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Analyzes an image file and returns dimensions with aspect ratio
 * Returns null for non-image files (videos, etc.)
 */
export async function analyzeImageFile(
  file: File
): Promise<ImageDimensions | null> {
  // Only analyze image files
  if (!file.type.startsWith('image/')) {
    return null;
  }

  try {
    return await getImageDimensions(file);
  } catch (error) {
    console.error('Image analysis failed:', error);
    return null;
  }
}

/**
 * Analyzes an asset by storage path (data URL or remote URL)
 * Returns null if analysis fails or for non-images
 */
export async function analyzeAssetByPath(
  storagePath: string,
  mimeType?: string | null
): Promise<ImageDimensions | null> {
  // Check mime type if available
  if (mimeType && !mimeType.startsWith('image/')) {
    return null;
  }

  try {
    return await getImageDimensions(storagePath);
  } catch (error) {
    console.error('Asset analysis failed:', error);
    return null;
  }
}

/**
 * Formats aspect ratio as a readable string (e.g., "16:9", "4:5")
 */
export function formatAspectRatio(aspectRatio: number): string {
  // Common ratios
  const commonRatios: Record<string, number> = {
    '1:1': 1.0,
    '4:5': 0.8,
    '9:16': 0.5625,
    '16:9': 1.7778,
    '3:2': 1.5,
    '2:3': 0.6667,
    '1.91:1': 1.91,
  };

  // Find closest common ratio
  let closest = '1:1';
  let minDiff = Math.abs(aspectRatio - 1.0);

  for (const [label, value] of Object.entries(commonRatios)) {
    const diff = Math.abs(aspectRatio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = label;
    }
  }

  // If close enough to a common ratio, use it
  if (minDiff < 0.05) {
    return closest;
  }

  // Otherwise, format as decimal
  return aspectRatio.toFixed(2) + ':1';
}
