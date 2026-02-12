// Database types for Pulse.Online

export type GovernanceProfile = 'strict' | 'standard' | 'experimental';
export type ChannelStatus = 'private' | 'beta' | 'public';
export type ContentType = 'reel' | 'static' | 'carousel' | 'text';
export type PostStatus = 'draft' | 'validated' | 'needs_edits' | 'blocked' | 'scheduled' | 'published' | 'failed';
export type GovernanceStatus = 'unreviewed' | 'allowed' | 'allowed_with_edits' | 'blocked';
export type AssetRole = 'proof' | 'decorative' | 'educational' | 'ui';
export type AssetQualityStatus = 'unreviewed' | 'ok' | 'warning' | 'blocked';

export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube' | 'pinterest';

// Brand Pack types
export type BrandPersonality = 'authoritative' | 'calm' | 'experimental' | 'playful' | 'technical' | 'editorial';
export type RiskTolerance = 'low' | 'medium' | 'high';
export type VisualStyle = 'photography' | 'illustration' | 'ui_mockup' | 'abstract' | 'diagram';
export type RealismLevel = 'photorealistic' | 'stylized' | 'abstract';

export interface VisionVerdict {
  containsText: boolean;
  containsPeople: boolean;
  peopleType: 'unknown' | 'photo_real' | 'illustration' | 'none';
  containsLogosOrWatermarks: boolean;
  motifsDetected: string[];
  riskNotes: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface VisualVariant {
  id: string;
  platformKey: string;
  targetAspect: string;
  method: 'crop' | 'pad' | 'ai';
  sourceAssetId: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  dataUrl?: string;
  storagePath?: string;
  governance: {
    status: 'ok' | 'warn' | 'blocked';
    score: number;
    issues: Array<{
      severity: 'warn' | 'error';
      code: string;
      message: string;
      fix: string;
    }>;
  };
  /** Vision analysis result from OpenAI (only for method='ai') */
  analysis?: {
    vision?: VisionVerdict;
    checkedAt?: string;
  };
  createdAt: string;
}

export interface CadenceRules {
  min_days_between_posts?: number;
  max_posts_per_week?: number;
  preferred_days?: string[];
}

export interface AssetRequirements {
  static_requires_image?: boolean;
  carousel_requires_image?: boolean;
  image_recommended?: boolean;
  min_image_width?: number;
  proof_required_for_claims?: boolean;
}

export interface BrandPack {
  id: string;
  channelId: string;
  identity: {
    mission: string;
    audience: string;
    brandPersonality: BrandPersonality[];
    riskTolerance: RiskTolerance;
  };
  languageRules: {
    requiredCTA: boolean;
    requiredHashtags: boolean;
    forbiddenClaims: string[];
    forbiddenComparisons: boolean;
    toneConstraints: {
      avoidSalesy: boolean;
      avoidHype: boolean;
      allowHumor: boolean;
    };
  };
  visualRules: {
    stylePreferences: VisualStyle[];
    realismLevel: RealismLevel;
    allowAIPeople: boolean;
    allowRealPeople: boolean;
    allowTextInImage: boolean;
    colorMoodHints: string[];
    forbiddenVisualMotifs: string[];
  };
  aiPromptAnchors: {
    imageSystemPrompt: string;
    imageStylePrompt: string;
  };
  governanceOverrides: {
    requireVariantApproval: boolean;
    escalateVisualWarnings: boolean;
  };
  examples?: {
    preferredVisuals?: string[];
    dislikedVisuals?: string[];
  };
  completeness: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherChannel {
  id: string;
  name: string;
  product_code: string;
  status: ChannelStatus;
  governance_profile: GovernanceProfile;
  allowed_platforms: Platform[];
  cadence_rules: CadenceRules;
  asset_requirements: AssetRequirements;
  default_timezone: string;
  default_schedule_time: string;
  brand_pack_id: string | null;
  ai_daily_cap: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  brandPack?: BrandPack;
}

export interface PublisherPost {
  id: string;
  channel_id: string;
  date: string;
  scheduled_at: string | null;
  platform_targets: Platform[];
  content_type: ContentType;
  theme: string | null;
  caption: string;
  cta: string | null;
  hashtags: string | null;
  status: PostStatus;
  governance_status: GovernanceStatus;
  governance_score: number;
  governance_refusals: GovernanceRefusal[];
  governance_unlock_path: string | null;
  // Phase 1: Platform-safe media detection
  visual_handling: 'single' | 'variants';
  media_aspect_ratio: number | null;
  media_risk_by_platform: Record<string, 'ok' | 'warn' | 'unknown'>;
  // Phase 2: Visual variant generation
  visual_variants: VisualVariant[];
  visual_variant_mode: 'auto' | 'ai';
  variant_generation_status: 'idle' | 'generating' | 'partial' | 'ready' | 'failed';
  variant_last_generated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  channel?: PublisherChannel;
  assets?: PublisherAsset[];
}

export interface GovernanceRefusal {
  rule: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface PublisherAsset {
  id: string;
  channel_id: string;
  post_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  file_size: number | null;
  role: AssetRole;
  quality_status: AssetQualityStatus;
  notes: string | null;
  created_at: string;
}

export interface PublisherGovernanceEvent {
  id: string;
  channel_id: string;
  post_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// Form/input types
export interface ChannelFormData {
  name: string;
  product_code: string;
  status: ChannelStatus;
  governance_profile: GovernanceProfile;
  allowed_platforms: Platform[];
  cadence_rules: CadenceRules;
  asset_requirements: AssetRequirements;
  default_timezone: string;
  default_schedule_time: string;
}

export interface PostFormData {
  channel_id: string;
  date: string;
  platform_targets: Platform[];
  content_type: ContentType;
  theme?: string;
  caption: string;
  cta?: string;
  hashtags?: string;
}

// CSV Import types
export interface CSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  date: string;
  platform_targets: string;
  content_type: string;
  theme?: string;
  caption: string;
  cta?: string;
  hashtags?: string;
  week?: string;       // "Week 1", "Week 2" etc. — used to generate dates if date column is empty
  notes?: string;      // Additional notes/angle — appended to generated captions
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; message: string }[];
  posts: PostFormData[];
}
