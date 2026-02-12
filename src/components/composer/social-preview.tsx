'use client';

import { useState } from 'react';
import type { Platform, PublisherAsset, VisualVariant } from '@/lib/types/database';

interface SocialPreviewProps {
  caption: string;
  channelName: string;
  hashtags: string | null;
  cta: string | null;
  platforms: Platform[];
  assets: PublisherAsset[];
  date: string;
  variants?: VisualVariant[];
}

// Helper to get variant for a specific platform
// Maps platform names to their exact variant platformKey patterns
function getVariantForPlatform(
  platform: string,
  variants: VisualVariant[] = []
): VisualVariant | undefined {
  // Map platform to expected variant platformKey (must match PLATFORM_VARIANT_TARGETS keys)
  const platformKeyMap: Record<string, string[]> = {
    twitter: ['x_twitter'],
    instagram: ['instagram_feed', 'instagram_reels'],
    facebook: ['facebook'],
    linkedin: ['linkedin'],
    tiktok: ['tiktok'],
    youtube: ['youtube_thumbnail'],
    pinterest: ['pinterest'],
  };

  const expectedKeys = platformKeyMap[platform] || [platform];
  
  // Find variant with matching platformKey
  return variants.find((v) => 
    expectedKeys.some(key => v.platformKey === key)
  );
}

// ─── Twitter / X Preview ─────────────────────────────────────────

function TwitterPreview({ caption, channelName, hashtags, assets, date, variants }: SocialPreviewProps) {
  const handle = `@${channelName.replace(/\s+/g, '').toLowerCase()}`;
  const fullText = [caption, hashtags].filter(Boolean).join('\n\n');
  
  // Use variant if available and approved
  const variant = getVariantForPlatform('twitter', variants);
  const useVariant = variant && variant.governance.status === 'ok';
  const imageSource = useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path;
  const hasImage = !!imageSource;

  return (
    <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {channelName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-[15px] truncate">{channelName}</span>
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-blue-400 shrink-0" fill="currentColor">
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
            </svg>
          </div>
          <span className="text-zinc-500 text-[13px]">{handle}</span>
        </div>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500 shrink-0" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-[15px] text-white whitespace-pre-wrap leading-5">{fullText}</p>
      </div>

      {/* Image */}
      {hasImage && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-zinc-800">
          <img
            src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
            alt="Post media"
            className="w-full object-contain bg-black aspect-video"
          />
        </div>
      )}

      {/* Footer actions */}
      <div className="px-4 pb-3 flex items-center justify-between text-zinc-500">
        <div className="flex items-center gap-1 text-[13px]">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 21a9 9 0 1 0-9-9c0 1.5.4 2.9 1 4.2L3 21l4.8-1c1.3.6 2.7 1 4.2 1z" />
          </svg>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M7 17l-4-4 4-4M17 7l4 4-4 4M3 13h18" />
          </svg>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.5l7.8-7.8 1-1.3a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <span>0</span>
        </div>
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </div>

      {/* Timestamp */}
      <div className="px-4 pb-3 border-t border-zinc-800 pt-3">
        <span className="text-zinc-500 text-[13px]">{formatDate(date)} · <span className="text-white">0</span> Views</span>
      </div>
    </div>
  );
}

// ─── Instagram Preview ───────────────────────────────────────────

function InstagramPreview({ caption, channelName, hashtags, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const variant = getVariantForPlatform('instagram', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-3 border-b border-zinc-900">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-yellow-500 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
            {channelName.charAt(0)}
          </div>
        </div>
        <span className="text-white font-semibold text-sm flex-1">{channelName.replace(/\s+/g, '').toLowerCase()}</span>
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      {/* Image area */}
      {hasImage ? (
        <img
          src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
          alt="Post media"
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-zinc-900 flex items-center justify-center">
          <span className="text-zinc-600 text-sm">No media</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.5l7.8-7.8 1-1.3a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <span className="text-white text-sm font-semibold">0 likes</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-sm text-white">
          <span className="font-semibold">{channelName.replace(/\s+/g, '').toLowerCase()}</span>{' '}
          <span className="font-normal">{caption}</span>
        </p>
        {hashtags && (
          <p className="text-sm text-blue-400 mt-0.5">{hashtags}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <span className="text-zinc-500 text-[11px] uppercase">Just now</span>
      </div>
    </div>
  );
}

// ─── LinkedIn Preview ────────────────────────────────────────────

function LinkedInPreview({ caption, channelName, hashtags, cta, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const fullCaption = [caption, cta ? `\n${cta}` : null, hashtags ? `\n${hashtags}` : null].filter(Boolean).join('');
  const variant = getVariantForPlatform('linkedin', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-[#1b1f23] rounded-xl border border-zinc-700/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shrink-0">
          {channelName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{channelName}</p>
          <p className="text-zinc-400 text-xs">Software Product</p>
          <p className="text-zinc-500 text-xs">Just now · 🌐</p>
        </div>
        <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-5">{fullCaption}</p>
      </div>

      {/* Image */}
      {hasImage && (
        <img
          src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
          alt="Post media"
          className="w-full object-contain bg-zinc-900"
          style={{ aspectRatio: '1.91/1' }}
        />
      )}

      {/* Engagement bar */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-700/60">
        <div className="flex items-center gap-1">
          <span className="inline-flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-500 inline-flex items-center justify-center text-[8px]">👍</span>
            <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center text-[8px]">❤️</span>
          </span>
          <span>0</span>
        </div>
        <span>0 comments · 0 reposts</span>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center justify-around text-zinc-400 text-xs font-medium">
        {['👍 Like', '💬 Comment', '🔄 Repost', '📤 Send'].map((action) => (
          <button key={action} className="flex items-center gap-1.5 py-2 px-3 rounded hover:bg-zinc-700/40 transition-colors">
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Facebook Preview ────────────────────────────────────────────

function FacebookPreview({ caption, channelName, hashtags, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const fullText = [caption, hashtags].filter(Boolean).join('\n\n');
  const variant = getVariantForPlatform('facebook', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-[#242526] rounded-xl border border-zinc-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
          {channelName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[15px]">{channelName}</p>
          <p className="text-zinc-400 text-xs">Just now · 🌐</p>
        </div>
        <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-[15px] text-zinc-100 whitespace-pre-wrap leading-5">{fullText}</p>
      </div>

      {/* Image */}
      {hasImage && (
        <img
          src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
          alt="Post media"
          className="w-full object-contain bg-zinc-900"
          style={{ aspectRatio: '1.91/1' }}
        />
      )}

      {/* Engagement bar */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-700/50">
        <div className="flex items-center gap-1">
          <span className="inline-flex -space-x-1">
            <span className="w-4.5 h-4.5 rounded-full bg-blue-500 inline-flex items-center justify-center text-[10px]">👍</span>
          </span>
          <span>0</span>
        </div>
        <span>0 comments · 0 shares</span>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center justify-around text-zinc-400 text-sm font-medium">
        {['👍 Like', '💬 Comment', '↗️ Share'].map((action) => (
          <button key={action} className="flex items-center gap-2 py-2 px-4 rounded-md hover:bg-zinc-700/40 transition-colors">
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TikTok Preview ──────────────────────────────────────────────

function TikTokPreview({ caption, channelName, hashtags, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const fullText = [caption, hashtags].filter(Boolean).join(' ');
  const variant = getVariantForPlatform('tiktok', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden relative">
      {/* Video / image area */}
      <div className="relative aspect-9/16 max-h-90 bg-zinc-900 overflow-hidden">
        {hasImage ? (
          <img
            src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-600 text-sm">Video preview</span>
          </div>
        )}

        {/* Right side actions */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
          {[
            { icon: '❤️', count: '0' },
            { icon: '💬', count: '0' },
            { icon: '🔖', count: '0' },
            { icon: '↗️', count: '0' },
          ].map(({ icon, count }) => (
            <div key={icon} className="flex flex-col items-center">
              <span className="text-xl">{icon}</span>
              <span className="text-white text-[11px] mt-0.5">{count}</span>
            </div>
          ))}
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-3 pt-10">
          <p className="text-white font-semibold text-sm mb-1">@{channelName.replace(/\s+/g, '').toLowerCase()}</p>
          <p className="text-white text-xs leading-4 line-clamp-3">{fullText}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-white">🎵</span>
            <div className="overflow-hidden">
              <p className="text-[11px] text-white whitespace-nowrap animate-marquee">Original sound - {channelName}</p>
            </div>
          </div>
        </div>

        {/* Profile avatar */}
        <div className="absolute right-3 bottom-57.5">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white">
            {channelName.charAt(0)}
          </div>
          <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center -mt-2.5 mx-auto text-white text-xs">+</div>
        </div>
      </div>
    </div>
  );
}

// ─── YouTube Preview ───────────────────────────────, variants }: SocialPreviewProps) {
// ─── YouTube Preview ─────────────────────────────────────────────

function YouTubePreview({ caption, channelName, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const variant = getVariantForPlatform('youtube', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-zinc-800 overflow-hidden">
      {/* Video thumbnail */}
      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        {hasImage ? (
          <img
            src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
            alt="Thumbnail"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-600 text-sm">Thumbnail</span>
          </div>
        )}
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-10 bg-red-600 rounded-xl flex items-center justify-center opacity-90">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] px-1.5 py-0.5 rounded">0:30</span>
      </div>

      {/* Info */}
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {channelName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-2 leading-5">{caption}</p>
          <p className="text-zinc-400 text-xs mt-1">{channelName} · 0 views · Just now</p>
        </div>
      </div>
    </div>
  );
}

// ─── Pinterest Preview ───────────────────────────────────────────

function PinterestPreview({ caption, channelName, assets, variants }: SocialPreviewProps) {
  const hasImage = assets.some((a) => a.mime_type?.startsWith('image/'));
  const variant = getVariantForPlatform('pinterest', variants);
  const useVariant = variant && variant.governance.status === 'ok';

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Pin image */}
      <div className="relative bg-zinc-900 overflow-hidden rounded-t-2xl">
        {hasImage ? (
          <img
            src={useVariant ? variant.dataUrl : assets.find((a) => a.mime_type?.startsWith('image/'))?.storage_path}
            alt="Pin"
            className="w-full object-contain bg-zinc-900"
            style={{ aspectRatio: '2/3' }}
          />
        ) : (
          <div className="w-full flex items-center justify-center bg-zinc-900" style={{ aspectRatio: '2/3' }}>
            <span className="text-zinc-600 text-sm">Pin image</span>
          </div>
        )}
        {/* Save button */}
        <button className="absolute top-3 right-3 bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full">
          Save
        </button>
      </div>

      {/* Description */}
      <div className="p-3">
        <p className="text-white text-sm font-medium line-clamp-2">{caption}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-[10px] font-bold">
            {channelName.charAt(0)}
          </div>
          <span className="text-zinc-400 text-xs">{channelName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Preview Component ──────────────────────────────────────

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: '𝕏 / Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
};

const PREVIEW_COMPONENTS: Record<Platform, React.FC<SocialPreviewProps>> = {
  twitter: TwitterPreview,
  instagram: InstagramPreview,
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  tiktok: TikTokPreview,
  youtube: YouTubePreview,
  pinterest: PinterestPreview,
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function SocialPreview(props: SocialPreviewProps) {
  const activePlatforms = props.platforms.filter((p) => PREVIEW_COMPONENTS[p]);
  const [selected, setSelected] = useState<Platform>(activePlatforms[0] || 'twitter');

  // Keep selected in sync with available platforms
  const platform = activePlatforms.includes(selected) ? selected : activePlatforms[0] || 'twitter';
  const PreviewComponent = PREVIEW_COMPONENTS[platform];

  if (activePlatforms.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Select platforms to see previews
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Platform tabs */}
      <div className="flex flex-wrap gap-1">
        {activePlatforms.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              platform === p
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Preview */}
      <PreviewComponent {...props} />
    </div>
  );
}
