// Database types for Pulse.Online

export type GovernanceProfile = 'strict' | 'standard' | 'experimental';
export type ChannelStatus = 'private' | 'beta' | 'public';
export type ContentType = 'reel' | 'static' | 'carousel' | 'text';
export type PostStatus = 'draft' | 'validated' | 'needs_edits' | 'blocked' | 'scheduled' | 'published' | 'failed';
export type GovernanceStatus = 'unreviewed' | 'allowed' | 'allowed_with_edits' | 'blocked';
export type AssetRole = 'proof' | 'decorative' | 'educational' | 'ui';
export type AssetQualityStatus = 'unreviewed' | 'ok' | 'warning' | 'blocked';

export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube' | 'pinterest';

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
  archived_at: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; message: string }[];
  posts: PostFormData[];
}
