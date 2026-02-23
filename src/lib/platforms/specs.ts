/**
 * Phase 4: Platform Spec Registry
 *
 * Typed registry of platform output specs for deterministic
 * image variant generation (crop / resize). Extends the Phase 1
 * aspect-ratio-only data with concrete pixel dimensions, file-size
 * limits, output format, and filename pattern.
 */

export type PlatformSpecId =
  | 'instagram_feed'
  | 'instagram_story'
  | 'instagram_reels'
  | 'tiktok'
  | 'x_twitter'
  | 'linkedin'
  | 'facebook_feed'
  | 'youtube_thumbnail'
  | 'pinterest_pin';

export type OutputFormat = 'jpg' | 'png' | 'webp';

export interface PlatformSpec {
  /** Unique key used in filenames and DB rows */
  id: PlatformSpecId;
  /** Human-readable label */
  label: string;
  /** Target width in px */
  width: number;
  /** Target height in px */
  height: number;
  /** Derived w/h */
  aspectRatio: number;
  /** Optional max file size (bytes). Enforced at quality-reduction time. */
  maxFileSizeBytes?: number;
  /** Default output format */
  outputFormat: OutputFormat;
  /** Filename pattern.  Tokens: {slug}, {platformId}, {w}, {h} */
  filenamePattern: string;
}

// ────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────

const SPECS: Record<PlatformSpecId, PlatformSpec> = {
  instagram_feed: {
    id: 'instagram_feed',
    label: 'Instagram Feed',
    width: 1080,
    height: 1080,
    aspectRatio: 1,
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  instagram_story: {
    id: 'instagram_story',
    label: 'Instagram Story',
    width: 1080,
    height: 1920,
    aspectRatio: 1080 / 1920, // 0.5625  (9:16)
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  instagram_reels: {
    id: 'instagram_reels',
    label: 'Instagram Reels',
    width: 1080,
    height: 1920,
    aspectRatio: 1080 / 1920,
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    width: 1080,
    height: 1920,
    aspectRatio: 1080 / 1920,
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  x_twitter: {
    id: 'x_twitter',
    label: 'Twitter / X',
    width: 1600,
    height: 900,
    aspectRatio: 1600 / 900, // ~1.778  (16:9)
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    width: 1200,
    height: 627,
    aspectRatio: 1200 / 627, // ~1.91:1
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  facebook_feed: {
    id: 'facebook_feed',
    label: 'Facebook Feed',
    width: 1200,
    height: 630,
    aspectRatio: 1200 / 630,
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  youtube_thumbnail: {
    id: 'youtube_thumbnail',
    label: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    aspectRatio: 1280 / 720,
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
  pinterest_pin: {
    id: 'pinterest_pin',
    label: 'Pinterest Pin',
    width: 1000,
    height: 1500,
    aspectRatio: 1000 / 1500, // 2:3
    outputFormat: 'jpg',
    filenamePattern: '{slug}_{platformId}_{w}x{h}.jpg',
  },
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Returns a single spec by id (throws if unknown). */
export function getSpec(id: PlatformSpecId): PlatformSpec {
  const spec = SPECS[id];
  if (!spec) throw new Error(`Unknown platform spec: ${id}`);
  return spec;
}

/** Returns an ordered list of specs for the given ids. */
export function listSpecs(ids: PlatformSpecId[]): PlatformSpec[] {
  return ids.map(getSpec);
}

/** Returns all known spec ids. */
export function allSpecIds(): PlatformSpecId[] {
  return Object.keys(SPECS) as PlatformSpecId[];
}

/** Returns all specs as an array. */
export function allSpecs(): PlatformSpec[] {
  return Object.values(SPECS);
}

/**
 * Maps a database Platform value + content type to a PlatformSpecId.
 * For posts that have a platform like "instagram" we pick the
 * most common spec; callers can override in the UI.
 */
export function platformToSpecId(
  platform: string,
  contentType?: string
): PlatformSpecId | null {
  const p = platform.toLowerCase();

  if (p === 'instagram') {
    if (contentType === 'reel') return 'instagram_reels';
    return 'instagram_feed';
  }
  if (p === 'twitter') return 'x_twitter';
  if (p === 'linkedin') return 'linkedin';
  if (p === 'facebook') return 'facebook_feed';
  if (p === 'tiktok') return 'tiktok';
  if (p === 'youtube') return 'youtube_thumbnail';
  if (p === 'pinterest') return 'pinterest_pin';

  // Already a valid spec id?
  if (p in SPECS) return p as PlatformSpecId;

  return null;
}

/**
 * Resolves a filename from a spec + slug.
 */
export function resolveFilename(spec: PlatformSpec, slug: string): string {
  return spec.filenamePattern
    .replace('{slug}', slug)
    .replace('{platformId}', spec.id)
    .replace('{w}', String(spec.width))
    .replace('{h}', String(spec.height));
}
