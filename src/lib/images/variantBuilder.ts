/**
 * Phase 4: Variant Builder
 *
 * Deterministic image transforms using Sharp.
 * Reads a source buffer, crops/resizes to each platform spec,
 * and returns the resulting buffers + metadata.
 *
 * No AI generation — only crop/resize.
 */

import sharp from 'sharp';
import { getSpec, resolveFilename, type PlatformSpecId } from '@/lib/platforms/specs';
import type { VariantBuildResult } from '@/lib/types/database';

export type CropMode = 'cover' | 'contain';
export type Anchor = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface BuildVariantsInput {
  /** Raw source image bytes */
  sourceBuffer: Buffer;
  /** Platform ids to generate variants for */
  platforms: PlatformSpecId[];
  /** How to resize: cover (crop) or contain (letterbox). Default: cover */
  cropMode?: CropMode;
  /** Crop anchor point. Default: center */
  anchor?: Anchor;
  /** Post slug or id used in filenames */
  slug: string;
}

export interface BuildVariantsOutput {
  variants: (VariantBuildResult & { filename: string })[];
  sourceWidth: number;
  sourceHeight: number;
  durationMs: number;
  errors: string[];
}

/**
 * Generate deterministic image variants for each requested platform.
 */
export async function buildVariants(
  input: BuildVariantsInput
): Promise<BuildVariantsOutput> {
  const start = Date.now();
  const errors: string[] = [];
  const variants: (VariantBuildResult & { filename: string })[] = [];

  // Read source metadata
  const sourceMeta = await sharp(input.sourceBuffer).metadata();
  const sourceWidth = sourceMeta.width ?? 0;
  const sourceHeight = sourceMeta.height ?? 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Cannot read source image dimensions');
  }

  const cropMode = input.cropMode ?? 'cover';

  for (const platformId of input.platforms) {
    try {
      const spec = getSpec(platformId);
      const upscaleWarning =
        sourceWidth < spec.width || sourceHeight < spec.height;

      if (upscaleWarning) {
        errors.push(
          `[warn] ${platformId}: source ${sourceWidth}x${sourceHeight} is smaller than target ${spec.width}x${spec.height}`
        );
      }

      // Determine sharp fit mode
      const fit: keyof sharp.FitEnum = cropMode === 'cover' ? 'cover' : 'contain';

      // Build the pipeline
      let pipeline = sharp(input.sourceBuffer)
        .resize(spec.width, spec.height, {
          fit,
          position: input.anchor ?? 'center',
          // When containing, fill background with white
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          // Prevent huge upscales but allow modest ones
          withoutEnlargement: false,
        });

      // Encode to target format
      const fmt = spec.outputFormat;
      if (fmt === 'jpg') {
        pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      } else if (fmt === 'png') {
        pipeline = pipeline.png({ compressionLevel: 9 });
      } else if (fmt === 'webp') {
        pipeline = pipeline.webp({ quality: 82 });
      }

      const outputBuffer = await pipeline.toBuffer();

      // Optionally shrink quality if maxFileSizeBytes is exceeded
      let finalBuffer = outputBuffer;
      if (spec.maxFileSizeBytes && outputBuffer.byteLength > spec.maxFileSizeBytes) {
        // Retry at lower quality
        let lowerQuality = 60;
        while (lowerQuality >= 20) {
          let retry = sharp(input.sourceBuffer).resize(spec.width, spec.height, {
            fit,
            position: input.anchor ?? 'center',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
            withoutEnlargement: false,
          });

          if (fmt === 'jpg') retry = retry.jpeg({ quality: lowerQuality, mozjpeg: true });
          else if (fmt === 'webp') retry = retry.webp({ quality: lowerQuality });
          else break; // PNG quality can't be reduced this way

          finalBuffer = await retry.toBuffer();
          if (finalBuffer.byteLength <= spec.maxFileSizeBytes) break;
          lowerQuality -= 10;
        }
      }

      const filename = resolveFilename(spec, input.slug);

      variants.push({
        platformId,
        buffer: finalBuffer,
        width: spec.width,
        height: spec.height,
        format: fmt,
        bytes: finalBuffer.byteLength,
        upscaleWarning,
        filename,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[error] ${platformId}: ${msg}`);
    }
  }

  return {
    variants,
    sourceWidth,
    sourceHeight,
    durationMs: Date.now() - start,
    errors,
  };
}
