'use client';

import { useState, useEffect } from 'react';
import { X, Building, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BrandPackWizard } from './brand-pack-wizard';
import { fetchBrandPack, saveBrandPack } from '@/lib/storage/brand-packs';
import type { PublisherChannel, Platform, GovernanceProfile, ChannelStatus, BrandPack } from '@/lib/types/database';
import type { BrandPackFormInput } from '@/lib/schemas/brand-pack';

interface ChannelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PublisherChannel>) => void;
  channel: PublisherChannel | null;
}

const PLATFORMS: Platform[] = [
  'instagram',
  'twitter',
  'linkedin',
  'facebook',
  'tiktok',
  'youtube',
  'pinterest',
];

const GOVERNANCE_OPTIONS = [
  { value: 'strict', label: 'Strict - No hype, mandatory CTA/hashtags' },
  { value: 'standard', label: 'Standard - Softer language, benefits OK' },
  { value: 'experimental', label: 'Experimental - Creative freedom' },
];

const STATUS_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'beta', label: 'Beta' },
  { value: 'public', label: 'Public' },
];

export function ChannelFormModal({
  isOpen,
  onClose,
  onSave,
  channel,
}: ChannelFormModalProps) {
  const [tab, setTab] = useState<'details' | 'brand-pack'>('details');
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [status, setStatus] = useState<ChannelStatus>('private');
  const [governanceProfile, setGovernanceProfile] = useState<GovernanceProfile>('standard');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [maxPostsPerWeek, setMaxPostsPerWeek] = useState('7');
  const [minDaysBetweenPosts, setMinDaysBetweenPosts] = useState('1');
  const [defaultScheduleTime, setDefaultScheduleTime] = useState('09:00');
  const [staticRequiresImage, setStaticRequiresImage] = useState(false);
  const [brandPack, setBrandPack] = useState<BrandPack | null>(null);
  const [loadingBrandPack, setLoadingBrandPack] = useState(false);

  // React-recommended pattern: adjust state during render instead of useEffect
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevChannelKey, setPrevChannelKey] = useState<string | null>(null);
  const channelKey = channel ? `${channel.id}-${isOpen}` : (isOpen ? 'new' : null);
  if (channelKey !== prevChannelKey) {
    setPrevChannelKey(channelKey);
    if (channel) {
      setName(channel.name);
      setProductCode(channel.product_code);
      setStatus(channel.status);
      setGovernanceProfile(channel.governance_profile);
      setSelectedPlatforms(channel.allowed_platforms);
      setMaxPostsPerWeek(String(channel.cadence_rules.max_posts_per_week || 7));
      setMinDaysBetweenPosts(String(channel.cadence_rules.min_days_between_posts || 1));
      setDefaultScheduleTime(channel.default_schedule_time);
      setStaticRequiresImage(channel.asset_requirements.static_requires_image || false);
      setLoadingBrandPack(true);
    } else {
      setName('');
      setProductCode('');
      setStatus('private');
      setGovernanceProfile('standard');
      setSelectedPlatforms([]);
      setMaxPostsPerWeek('7');
      setMinDaysBetweenPosts('1');
      setDefaultScheduleTime('09:00');
      setStaticRequiresImage(false);
      setBrandPack(null);
      setTab('details');
    }
  }

  // Async brand pack fetch stays in useEffect (setState in async callback is fine)
  useEffect(() => {
    if (channel) {
      fetchBrandPack(channel.id).then((pack) => {
        setBrandPack(pack);
        setLoadingBrandPack(false);
      });
    }
  }, [channel, isOpen]);

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      name,
      product_code: productCode,
      status,
      governance_profile: governanceProfile,
      allowed_platforms: selectedPlatforms,
      cadence_rules: {
        max_posts_per_week: parseInt(maxPostsPerWeek) || 7,
        min_days_between_posts: parseInt(minDaysBetweenPosts) || 0,
      },
      asset_requirements: {
        static_requires_image: staticRequiresImage,
      },
      default_schedule_time: defaultScheduleTime,
      default_timezone: 'Europe/London',
    });
  };

  const handleBrandPackComplete = async (data: BrandPackFormInput) => {
    if (!channel) return;
    
    try {
      const savedPack = await saveBrandPack(channel.id, data, brandPack?.id);
      setBrandPack(savedPack);
      setTab('details');
    } catch (error) {
      console.error('Failed to save brand pack:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            {channel ? 'Edit Channel' : 'Add New Channel'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {channel && (
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setTab('details')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'details'
                  ? 'text-white border-b-2 border-emerald-600 bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Building className="h-4 w-4" />
              Channel Details
            </button>
            <button
              onClick={() => setTab('brand-pack')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'brand-pack'
                  ? 'text-white border-b-2 border-emerald-600 bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Brand Pack
              {brandPack && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  brandPack.completeness >= 70
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {brandPack.completeness}%
                </span>
              )}
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {tab === 'details' ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Channel Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Infinite Authority"
            required
          />

          <Input
            label="Product Code"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="e.g., ia"
            required
            disabled={!!channel}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ChannelStatus)}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Governance Profile"
              value={governanceProfile}
              onChange={(e) => setGovernanceProfile(e.target.value as GovernanceProfile)}
              options={GOVERNANCE_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Allowed Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handlePlatformToggle(platform)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedPlatforms.includes(platform)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Posts/Week"
              type="number"
              value={maxPostsPerWeek}
              onChange={(e) => setMaxPostsPerWeek(e.target.value)}
              min="1"
              max="50"
            />
            <Input
              label="Min Days Between"
              type="number"
              value={minDaysBetweenPosts}
              onChange={(e) => setMinDaysBetweenPosts(e.target.value)}
              min="0"
              max="30"
            />
          </div>

          <Input
            label="Default Schedule Time"
            type="time"
            value={defaultScheduleTime}
            onChange={(e) => setDefaultScheduleTime(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="staticRequiresImage"
              checked={staticRequiresImage}
              onChange={(e) => setStaticRequiresImage(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="staticRequiresImage" className="text-sm text-zinc-300">
              Require image for static posts
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !productCode || selectedPlatforms.length === 0}>
              {channel ? 'Save Changes' : 'Create Channel'}
            </Button>
          </div>
        </form>
          ) : (
            <div className="p-6">
              {loadingBrandPack ? (
                <div className="text-center py-12 text-zinc-400">Loading Brand Pack...</div>
              ) : (
                <BrandPackWizard
                  governanceProfile={governanceProfile}
                  initialData={brandPack ? {
                    identity: brandPack.identity,
                    languageRules: brandPack.languageRules,
                    visualRules: brandPack.visualRules,
                    aiPromptAnchors: brandPack.aiPromptAnchors,
                    governanceOverrides: brandPack.governanceOverrides,
                    examples: brandPack.examples,
                  } : undefined}
                  onComplete={handleBrandPackComplete}
                  onCancel={() => setTab('details')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
