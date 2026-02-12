/**
 * OpenAI Image Generation Service
 * Server-side only — called from API routes, never from the client.
 *
 * Uses `gpt-image-1` with the Images API.
 * Maps platform aspect ratios to the three supported sizes:
 *   1024×1024 (square), 1536×1024 (landscape), 1024×1536 (portrait)
 */

import OpenAI from 'openai';

// ─── Types ──────────────────────────────────────────

export interface ImageGenerationInput {
  prompt: string;
  platformKey: string;
  targetAspect: string;
}

export interface ImageGenerationResult {
  base64: string;            // raw base64 (no data: prefix)
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  revised_prompt?: string;   // model may revise the prompt
}

export interface ImageGenerationError {
  code: 'api_error' | 'invalid_input' | 'content_policy' | 'rate_limit' | 'config_missing';
  message: string;
  fixPath: string;
}

// ─── Size mapping ───────────────────────────────────

type OpenAISize = '1024x1024' | '1536x1024' | '1024x1536';

interface SizeSpec {
  size: OpenAISize;
  width: number;
  height: number;
}

/**
 * Map a target aspect ratio string to the closest OpenAI-supported size.
 *
 * Landscape ratios (16:9, 1.91:1)      → 1536×1024
 * Portrait ratios  (4:5, 9:16, 2:3)    → 1024×1536
 * Square           (1:1)               → 1024×1024
 */
function mapAspectToSize(targetAspect: string): SizeSpec {
  const landscape: SizeSpec = { size: '1536x1024', width: 1536, height: 1024 };
  const portrait:  SizeSpec = { size: '1024x1536', width: 1024, height: 1536 };
  const square:    SizeSpec = { size: '1024x1024', width: 1024, height: 1024 };

  switch (targetAspect) {
    case '16:9':
    case '1.91:1':
      return landscape;
    case '9:16':
    case '4:5':
    case '2:3':
      return portrait;
    case '1:1':
      return square;
    default: {
      // Parse "W:H" and pick closest
      const parts = targetAspect.split(':').map(Number);
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        const ratio = parts[0] / parts[1];
        if (ratio > 1.2) return landscape;
        if (ratio < 0.85) return portrait;
        return square;
      }
      return square;
    }
  }
}

// ─── Client factory ─────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('OPENAI_API_KEY not configured'), {
      code: 'config_missing' as const,
    });
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

// ─── Main generation function ───────────────────────

export async function generateAIImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const sizeSpec = mapAspectToSize(input.targetAspect);

  const response = await client.images.generate({
    model,
    prompt: input.prompt,
    n: 1,
    size: sizeSpec.size,
    quality: 'medium',
  });

  const imageData = response.data?.[0];
  if (!imageData) {
    throw Object.assign(new Error('No image returned from OpenAI'), {
      code: 'api_error' as const,
    });
  }

  // gpt-image-1 returns b64_json by default
  if (imageData.b64_json) {
    return {
      base64: imageData.b64_json,
      mimeType: 'image/png',
      width: sizeSpec.width,
      height: sizeSpec.height,
      revised_prompt: imageData.revised_prompt ?? undefined,
    };
  }

  // Fallback: URL-based response — download and convert
  if (imageData.url) {
    const imgResponse = await fetch(imageData.url);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    return {
      base64: buffer.toString('base64'),
      mimeType: 'image/png',
      width: sizeSpec.width,
      height: sizeSpec.height,
      revised_prompt: imageData.revised_prompt ?? undefined,
    };
  }

  throw Object.assign(new Error('OpenAI response contained neither b64_json nor url'), {
    code: 'api_error' as const,
  });
}

/**
 * Wraps generateAIImage with structured error handling suitable for the API route.
 * Returns either { ok: true, data } or { ok: false, error }.
 */
export async function safeGenerateAIImage(
  input: ImageGenerationInput
): Promise<
  | { ok: true; data: ImageGenerationResult }
  | { ok: false; error: ImageGenerationError }
> {
  try {
    const data = await generateAIImage(input);
    return { ok: true, data };
  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };

    // Config missing
    if (error.code === 'config_missing') {
      return {
        ok: false,
        error: {
          code: 'config_missing',
          message: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env.local',
          fixPath: 'Switch to Safe Auto-Crop',
        },
      };
    }

    // Rate limit
    if (error.status === 429) {
      return {
        ok: false,
        error: {
          code: 'rate_limit',
          message: 'OpenAI rate limit reached. Try again in a moment.',
          fixPath: 'Switch to Safe Auto-Crop',
        },
      };
    }

    // Content policy violation
    if (error.message?.includes('content_policy') || error.message?.includes('safety')) {
      return {
        ok: false,
        error: {
          code: 'content_policy',
          message: 'Image generation rejected by content policy. Try adjusting Brand Pack anchors.',
          fixPath: 'Update Brand Pack AI Prompt Anchors',
        },
      };
    }

    // Generic API error
    return {
      ok: false,
      error: {
        code: 'api_error',
        message: error.message || 'AI image generation failed',
        fixPath: 'Switch to Safe Auto-Crop',
      },
    };
  }
}
