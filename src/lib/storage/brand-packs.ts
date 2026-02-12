/**
 * Brand Pack Storage
 * Manages persistence of Brand Packs via localStorage
 * (brand_packs table does not exist in Supabase)
 */

import type { BrandPack } from '@/lib/types/database';
import type { BrandPackFormInput } from '@/lib/schemas/brand-pack';
import { calculateBrandPackCompleteness } from '@/lib/schemas/brand-pack';

const STORAGE_KEY = 'pulse_brand_packs';

// ─── Default Brand Packs for localStorage demo mode ──────────────

const DEFAULT_BRAND_PACKS: BrandPack[] = [
  {
    id: 'bp-ia',
    channelId: '1',
    identity: {
      mission: 'Helping professionals reclaim authority over their online presence through privacy-first tools and educational content.',
      audience: 'Privacy-conscious professionals, freelancers, and small business owners aged 28-50',
      brandPersonality: ['authoritative', 'calm'],
      riskTolerance: 'low',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: ['guaranteed', '#1', 'unbeatable'],
      forbiddenComparisons: true,
      toneConstraints: { avoidSalesy: true, avoidHype: true, allowHumor: false },
    },
    visualRules: {
      stylePreferences: ['photography', 'ui_mockup'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['deep navy', 'white', 'soft gold accents'],
      forbiddenVisualMotifs: ['padlocks', 'shields', 'stock-photo handshakes'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a clean, professional image for a privacy-focused SaaS brand. No people, no text overlays. Use deep navy and white tones with subtle gold accents. The image should feel authoritative yet approachable.',
      imageStylePrompt: 'Minimalist product photography style. Clean surfaces, soft studio lighting, desaturated background. Think Apple product page meets enterprise SaaS. No clutter, no busy patterns.',
    },
    governanceOverrides: { requireVariantApproval: true, escalateVisualWarnings: true },
    examples: { preferredVisuals: ['minimal desk setup', 'abstract data flow'], dislikedVisuals: ['generic stock photos', 'padlock icons'] },
    completeness: 95,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-quotekits',
    channelId: '2',
    identity: {
      mission: 'Curating and publishing beautiful, shareable quote graphics that inspire and motivate creative professionals.',
      audience: 'Creative professionals, designers, and social media managers looking for ready-to-post quote content',
      brandPersonality: ['playful', 'editorial'],
      riskTolerance: 'medium',
    },
    languageRules: {
      requiredCTA: false,
      requiredHashtags: true,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: false, avoidHype: false, allowHumor: true },
    },
    visualRules: {
      stylePreferences: ['illustration', 'abstract'],
      realismLevel: 'stylized',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: true,
      colorMoodHints: ['warm pastels', 'coral', 'soft gradients'],
      forbiddenVisualMotifs: ['generic motivational sunrise', 'clip art'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a stylish, shareable background graphic suitable for a quote overlay. The image should be vibrant but not overwhelming. Use warm pastels and soft gradients. No text, no people — this is a background canvas.',
      imageStylePrompt: 'Modern editorial illustration style. Soft gradients blending warm pastels with coral and cream tones. Abstract organic shapes. Clean and Instagram-ready. Think Dribbble meets Pinterest mood boards.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: false },
    completeness: 90,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-chaoscut',
    channelId: '3',
    identity: {
      mission: 'Pushing the boundaries of video editing culture with irreverent, meme-savvy content that celebrates the creative chaos of editing.',
      audience: 'Gen-Z and millennial video editors, content creators, and editing enthusiasts on TikTok and YouTube',
      brandPersonality: ['experimental', 'playful'],
      riskTolerance: 'high',
    },
    languageRules: {
      requiredCTA: false,
      requiredHashtags: false,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: false, avoidHype: false, allowHumor: true },
    },
    visualRules: {
      stylePreferences: ['abstract', 'illustration'],
      realismLevel: 'stylized',
      allowAIPeople: true,
      allowRealPeople: true,
      allowTextInImage: true,
      colorMoodHints: ['neon green', 'electric purple', 'dark backgrounds'],
      forbiddenVisualMotifs: ['corporate imagery', 'stock photos'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create an eye-catching, energetic image for a video editing brand. Bold neon colors on dark backgrounds. Glitch effects, pixel art elements, and creative chaos are welcome. Should feel like a thumbnail that stops the scroll.',
      imageStylePrompt: 'Cyberpunk-meets-vaporwave aesthetic. Neon green and electric purple on near-black backgrounds. Glitch textures, scanline effects, pixel fragments. High energy, chaotic but intentional. Think retro-futuristic editor vibes.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: false },
    completeness: 88,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-contextembed',
    channelId: '4',
    identity: {
      mission: 'Making digital asset metadata management accessible and essential — helping photographers and publishers understand IPTC, EXIF, and embedded rights.',
      audience: 'Professional photographers, picture editors, and digital publishers who need robust metadata workflows',
      brandPersonality: ['technical', 'authoritative'],
      riskTolerance: 'low',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: ['best', 'only solution', 'guaranteed'],
      forbiddenComparisons: true,
      toneConstraints: { avoidSalesy: true, avoidHype: true, allowHumor: true },
    },
    visualRules: {
      stylePreferences: ['ui_mockup', 'diagram'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['teal', 'slate grey', 'white', 'subtle orange accents'],
      forbiddenVisualMotifs: ['generic file icons', 'binary code rain', 'stock photography'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a clean, professional image representing digital asset metadata management. Show abstract representations of structured data, file organization, or metadata panels. Use teal and slate grey tones with subtle orange accents. No people, no text overlays.',
      imageStylePrompt: 'Technical product visualization style. Clean, precise lines. Soft ambient lighting on a subtle gradient background. Think of a premium SaaS dashboard screenshot reimagined as art. Structured, organized, trustworthy.',
    },
    governanceOverrides: { requireVariantApproval: true, escalateVisualWarnings: true },
    completeness: 92,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-shootcleaner',
    channelId: '5',
    identity: {
      mission: 'Simplifying photo culling and shoot management for busy photographers who want to spend less time sorting and more time shooting.',
      audience: 'Wedding and event photographers, portrait photographers, and studio managers processing high-volume shoots',
      brandPersonality: ['calm', 'technical'],
      riskTolerance: 'medium',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: false, avoidHype: true, allowHumor: true },
    },
    visualRules: {
      stylePreferences: ['photography', 'ui_mockup'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['warm amber', 'cream', 'charcoal'],
      forbiddenVisualMotifs: ['messy desks', 'stressed people', 'trash cans'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a calming, professional image representing streamlined photo workflow management. Show abstract representations of organized image grids, clean workspaces, or elegant file sorting. Warm amber and cream tones on charcoal. No people.',
      imageStylePrompt: 'Editorial product photography style with warm tones. Soft natural lighting, shallow depth of field. Clean and aspirational — the visual equivalent of a deep breath. Think Squarespace meets photography studio.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: true },
    completeness: 90,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-batchlight',
    channelId: '6',
    identity: {
      mission: 'Empowering photographers with intelligent batch processing tools for colour grading, exposure correction, and style consistency across entire shoots.',
      audience: 'Professional photographers and retouchers who process large volumes of images and need consistent results',
      brandPersonality: ['technical', 'calm'],
      riskTolerance: 'medium',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: false, avoidHype: true, allowHumor: false },
    },
    visualRules: {
      stylePreferences: ['photography', 'abstract'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['warm light', 'cool shadows', 'split-toning'],
      forbiddenVisualMotifs: ['before/after sliders', 'colour wheels'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a sophisticated image representing intelligent photo batch processing. Show abstract light and colour interactions — split toning, gradient maps, light spectrum effects. Warm highlights and cool shadows. No people, no text overlays.',
      imageStylePrompt: 'Fine-art photography meets data visualization. Beautiful light interactions on abstract surfaces. Prismatic colour splits, soft light refractions. Think James Turrell meets photo editing. Elegant and precise.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: false },
    completeness: 88,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-togninja',
    channelId: '7',
    identity: {
      mission: 'Making feature flags and A/B testing accessible to solo developers and small teams who want enterprise-grade release control without the enterprise price tag.',
      audience: 'Indie developers, small dev teams, and startup CTOs who need simple feature flag management',
      brandPersonality: ['playful', 'technical'],
      riskTolerance: 'high',
    },
    languageRules: {
      requiredCTA: false,
      requiredHashtags: false,
      forbiddenClaims: [],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: false, avoidHype: false, allowHumor: true },
    },
    visualRules: {
      stylePreferences: ['illustration', 'ui_mockup'],
      realismLevel: 'stylized',
      allowAIPeople: true,
      allowRealPeople: false,
      allowTextInImage: true,
      colorMoodHints: ['ninja black', 'electric red', 'dark grey'],
      forbiddenVisualMotifs: ['offensive ninja stereotypes', 'weapons'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a fun, developer-friendly image for a feature flag management tool with a ninja theme. Use dark backgrounds with electric red accents. Show abstract representations of toggle switches, code deployment, or feature branching. Playful but technical.',
      imageStylePrompt: 'Flat illustration style with subtle 3D depth. Dark backgrounds, crisp vector-like shapes, glowing red accent elements. Think GitHub Octocat meets ninja aesthetics. Developer culture, not corporate culture.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: false },
    completeness: 85,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-sitefixengine',
    channelId: '8',
    identity: {
      mission: 'Providing enterprise-grade website monitoring and automated fix suggestions that keep mission-critical sites running without manual intervention.',
      audience: 'DevOps engineers, site reliability teams, and enterprise web managers responsible for uptime and performance',
      brandPersonality: ['authoritative', 'technical'],
      riskTolerance: 'low',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: ['100% uptime', 'never fails', 'guaranteed'],
      forbiddenComparisons: true,
      toneConstraints: { avoidSalesy: true, avoidHype: true, allowHumor: false },
    },
    visualRules: {
      stylePreferences: ['ui_mockup', 'diagram'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['enterprise blue', 'green status', 'dark dashboard'],
      forbiddenVisualMotifs: ['red warning screens', 'fire', 'explosions'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a professional, enterprise-grade image representing website monitoring and reliability. Show abstract dashboard elements, uptime graphs, or network topology visualizations. Enterprise blue and green tones on dark backgrounds. No people, no text.',
      imageStylePrompt: 'Enterprise SaaS dashboard aesthetic. Dark mode UI elements with soft glowing indicators. Clean data visualization, precise grid layouts. Think Datadog or Grafana reimagined as fine art. Trustworthy and sophisticated.',
    },
    governanceOverrides: { requireVariantApproval: true, escalateVisualWarnings: true },
    completeness: 92,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'bp-assetliberator',
    channelId: '9',
    identity: {
      mission: 'Freeing creative assets from proprietary lock-in — helping teams extract, convert, and repurpose their media across any platform or format.',
      audience: 'Creative directors, marketing teams, and agencies dealing with multi-format asset management and conversion',
      brandPersonality: ['editorial', 'authoritative'],
      riskTolerance: 'medium',
    },
    languageRules: {
      requiredCTA: true,
      requiredHashtags: true,
      forbiddenClaims: ['free forever', 'unlimited'],
      forbiddenComparisons: false,
      toneConstraints: { avoidSalesy: true, avoidHype: true, allowHumor: false },
    },
    visualRules: {
      stylePreferences: ['photography', 'abstract'],
      realismLevel: 'photorealistic',
      allowAIPeople: false,
      allowRealPeople: false,
      allowTextInImage: false,
      colorMoodHints: ['liberation gold', 'deep indigo', 'clean white'],
      forbiddenVisualMotifs: ['broken chains', 'jail imagery', 'padlocks'],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Create a premium, editorial image representing creative asset liberation and format freedom. Show abstract representations of files transforming, formats flowing freely, or creative content being unlocked. Gold and deep indigo tones on clean white. No people.',
      imageStylePrompt: 'High-end editorial photography style. Clean compositions with dramatic lighting. Gold accents catching light on deep indigo surfaces. Think luxury brand meets creative tooling. Aspirational and empowering without being cliché.',
    },
    governanceOverrides: { requireVariantApproval: false, escalateVisualWarnings: true },
    completeness: 90,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

/**
 * Fetch Brand Pack by channel ID
 * @param channelCode - optional product_code (e.g. 'ia', 'contextembed') for direct mapping
 *                      when channels come from Supabase with UUID IDs
 */
export async function fetchBrandPack(channelId: string, channelCode?: string): Promise<BrandPack | null> {
  // brand_packs table doesn't exist in Supabase — use localStorage directly
  return fetchBrandPackFromLocalStorage(channelId, channelCode);
}

/**
 * Create or update Brand Pack
 */
export async function saveBrandPack(
  channelId: string,
  brandPackData: BrandPackFormInput,
  existingId?: string
): Promise<BrandPack> {
  const completeness = calculateBrandPackCompleteness(brandPackData);
  
  const brandPack: Omit<BrandPack, 'id' | 'createdAt' | 'updatedAt'> = {
    channelId,
    ...brandPackData,
    completeness,
  };

  // brand_packs table doesn't exist in Supabase — use localStorage directly
  return saveBrandPackToLocalStorage(channelId, brandPack, existingId);
}

/**
 * Delete Brand Pack
 */
export async function deleteBrandPack(brandPackId: string): Promise<void> {
  // brand_packs table doesn't exist in Supabase — use localStorage directly
  deleteBrandPackFromLocalStorage(brandPackId);
}

// ─── Channel ID mapping helper ───────────────────────────────────
// Channels may use simple IDs ('1'..'9') or UUIDs depending on how they were created.
// This maps between them so Brand Pack lookups always find the right pack.

const CHANNEL_CODE_TO_DEFAULT_ID: Record<string, string> = {
  ia: '1', quotekits: '2', chaoscut: '3', contextembed: '4',
  shootcleaner: '5', batchlight: '6', togninja: '7', sitefixengine: '8', assetliberator: '9',
};

function resolveChannelIdForBrandPack(channelId: string, channelCode?: string): string[] {
  // Return an array of IDs to try (in priority order)
  const candidates = [channelId];

  // If we have a product_code, map directly to the default Brand Pack ID
  if (channelCode) {
    const defaultId = CHANNEL_CODE_TO_DEFAULT_ID[channelCode];
    if (defaultId && defaultId !== channelId) {
      candidates.push(defaultId);
    }
  }

  // Also try to find the channel in localStorage to get its product_code
  try {
    const channelsStored = localStorage.getItem('pulse_channels');
    if (channelsStored) {
      const channels = JSON.parse(channelsStored);
      const channel = channels.find((c: { id: string }) => c.id === channelId);
      if (channel?.product_code) {
        const defaultId = CHANNEL_CODE_TO_DEFAULT_ID[channel.product_code];
        if (defaultId && !candidates.includes(defaultId)) {
          candidates.push(defaultId);
        }
      }
      // Also check if channelId is a simple ID and we need the UUID
      const channelByCode = channels.find((c: { product_code: string }) => {
        const mappedId = CHANNEL_CODE_TO_DEFAULT_ID[c.product_code];
        return mappedId === channelId;
      });
      if (channelByCode && !candidates.includes(channelByCode.id)) {
        candidates.push(channelByCode.id);
      }
    }
  } catch {
    // Silent fail
  }

  return candidates;
}

// ─── LocalStorage Fallback ───────────────────────────────────────

function fetchBrandPackFromLocalStorage(channelId: string, channelCode?: string): BrandPack | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const packs: BrandPack[] = stored ? JSON.parse(stored) : [];
    const candidates = resolveChannelIdForBrandPack(channelId, channelCode);

    // Search stored packs using all candidate IDs
    for (const cid of candidates) {
      const found = packs.find((p) => p.channelId === cid);
      if (found) return found;
    }

    // Fall back to default seed Brand Packs using all candidate IDs
    for (const cid of candidates) {
      const defaultPack = DEFAULT_BRAND_PACKS.find((p) => p.channelId === cid);
      if (defaultPack) {
        // Persist the default to localStorage so edits are saved
        packs.push(defaultPack);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
        return defaultPack;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function saveBrandPackToLocalStorage(
  channelId: string,
  brandPack: Omit<BrandPack, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): BrandPack {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let packs: BrandPack[] = stored ? JSON.parse(stored) : [];

    if (existingId) {
      // Update existing
      packs = packs.map((p) =>
        p.id === existingId
          ? {
              ...brandPack,
              id: existingId,
              createdAt: p.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : p
      );
    } else {
      // Create new
      const newPack: BrandPack = {
        ...brandPack,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      packs.push(newPack);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
    return packs.find((p) => p.channelId === channelId)!;
  } catch (error) {
    throw new Error('Failed to save brand pack to localStorage');
  }
}

function deleteBrandPackFromLocalStorage(brandPackId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    let packs: BrandPack[] = JSON.parse(stored);
    packs = packs.filter((p) => p.id !== brandPackId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
  } catch {
    // Silent fail
  }
}
