'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, MoreVertical, Shield, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChannelFormModal } from '@/components/channels/channel-form-modal';
import type { PublisherChannel, GovernanceProfile } from '@/lib/types/database';

const GOVERNANCE_COLORS: Record<GovernanceProfile, { bg: string; text: string }> = {
  strict: { bg: 'bg-red-500/20', text: 'text-red-400' },
  standard: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  experimental: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const STATUS_ICONS = {
  private: Lock,
  beta: Shield,
  public: Globe,
};

// Demo data - in production this comes from Supabase
const DEMO_CHANNELS: PublisherChannel[] = [
  {
    id: '1',
    name: 'Infinite Authority',
    product_code: 'ia',
    status: 'private',
    governance_profile: 'strict',
    allowed_platforms: ['instagram', 'linkedin', 'twitter'],
    cadence_rules: { min_days_between_posts: 1, max_posts_per_week: 7 },
    asset_requirements: { static_requires_image: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'QuoteKits',
    product_code: 'quotekits',
    status: 'private',
    governance_profile: 'standard',
    allowed_platforms: ['instagram', 'pinterest', 'twitter'],
    cadence_rules: { min_days_between_posts: 1, max_posts_per_week: 10 },
    asset_requirements: { image_recommended: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'ChaosCut',
    product_code: 'chaoscut',
    status: 'private',
    governance_profile: 'experimental',
    allowed_platforms: ['instagram', 'tiktok', 'youtube'],
    cadence_rules: { min_days_between_posts: 0, max_posts_per_week: 14 },
    asset_requirements: {},
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'ContextEmbed',
    product_code: 'contextembed',
    status: 'private',
    governance_profile: 'strict',
    allowed_platforms: ['linkedin', 'twitter'],
    cadence_rules: { min_days_between_posts: 2, max_posts_per_week: 5 },
    asset_requirements: { static_requires_image: true, carousel_requires_image: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'ShootCleaner',
    product_code: 'shootcleaner',
    status: 'private',
    governance_profile: 'experimental',
    allowed_platforms: ['instagram', 'twitter', 'youtube'],
    cadence_rules: { min_days_between_posts: 0, max_posts_per_week: 14 },
    asset_requirements: {},
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'BatchLight',
    product_code: 'batchlight',
    status: 'private',
    governance_profile: 'experimental',
    allowed_platforms: ['instagram', 'twitter', 'youtube'],
    cadence_rules: { min_days_between_posts: 0, max_posts_per_week: 14 },
    asset_requirements: {},
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'TogNinja',
    product_code: 'togninja',
    status: 'private',
    governance_profile: 'standard',
    allowed_platforms: ['instagram', 'twitter', 'youtube'],
    cadence_rules: { min_days_between_posts: 1, max_posts_per_week: 7 },
    asset_requirements: { image_recommended: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    name: 'SiteFixEngine',
    product_code: 'sitefixengine',
    status: 'private',
    governance_profile: 'strict',
    allowed_platforms: ['linkedin', 'twitter', 'instagram'],
    cadence_rules: { min_days_between_posts: 1, max_posts_per_week: 7 },
    asset_requirements: { static_requires_image: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '9',
    name: 'Asset Liberator',
    product_code: 'assetliberator',
    status: 'private',
    governance_profile: 'strict',
    allowed_platforms: ['instagram', 'facebook', 'twitter'],
    cadence_rules: { min_days_between_posts: 2, max_posts_per_week: 4 },
    asset_requirements: { static_requires_image: true, proof_required_for_claims: true },
    default_timezone: 'Europe/London',
    default_schedule_time: '09:00',
    brand_pack_id: null,
    ai_daily_cap: 50,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<PublisherChannel[]>(DEMO_CHANNELS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PublisherChannel | null>(null);

  const activeChannels = channels.filter((c) => !c.archived_at);
  const archivedChannels = channels.filter((c) => c.archived_at);

  const handleAddChannel = () => {
    setEditingChannel(null);
    setIsModalOpen(true);
  };

  const handleEditChannel = (channel: PublisherChannel) => {
    setEditingChannel(channel);
    setIsModalOpen(true);
  };

  const handleArchiveChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, archived_at: new Date().toISOString() } : c
      )
    );
  };

  const handleSaveChannel = (data: Partial<PublisherChannel>) => {
    if (editingChannel) {
      setChannels((prev) =>
        prev.map((c) => (c.id === editingChannel.id ? { ...c, ...data } : c))
      );
    } else {
      const newChannel: PublisherChannel = {
        id: crypto.randomUUID(),
        name: data.name || '',
        product_code: data.product_code || '',
        status: data.status || 'private',
        governance_profile: data.governance_profile || 'standard',
        allowed_platforms: data.allowed_platforms || [],
        cadence_rules: data.cadence_rules || {},
        asset_requirements: data.asset_requirements || {},
        default_timezone: data.default_timezone || 'Europe/London',
        default_schedule_time: data.default_schedule_time || '09:00',
        brand_pack_id: data.brand_pack_id || null,
        ai_daily_cap: data.ai_daily_cap || 10,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setChannels((prev) => [...prev, newChannel]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Channels</h1>
          <p className="text-zinc-400 mt-1">
            Manage product channels and governance profiles
          </p>
        </div>
        <Button onClick={handleAddChannel}>
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </div>

      {/* Governance Profile Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Badge className={`${GOVERNANCE_COLORS.strict.bg} ${GOVERNANCE_COLORS.strict.text}`}>
                STRICT
              </Badge>
              <span className="text-sm text-zinc-400">
                No hype, mandatory CTA/hashtags, images required
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${GOVERNANCE_COLORS.standard.bg} ${GOVERNANCE_COLORS.standard.text}`}>
                STANDARD
              </Badge>
              <span className="text-sm text-zinc-400">
                Softer language, benefits OK, images recommended
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${GOVERNANCE_COLORS.experimental.bg} ${GOVERNANCE_COLORS.experimental.text}`}>
                EXPERIMENTAL
              </Badge>
              <span className="text-sm text-zinc-400">
                Creative freedom, only blocks spam/scams
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Channels Grid */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Active Channels ({activeChannels.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeChannels.map((channel) => {
            const StatusIcon = STATUS_ICONS[channel.status];
            const govColors = GOVERNANCE_COLORS[channel.governance_profile];
            
            return (
              <Card key={channel.id} className="hover:border-zinc-700 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-zinc-500" />
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditChannel(channel)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveChannel(channel.id)}
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-emerald-400">
                      {channel.product_code}
                    </code>
                    <Badge className={`${govColors.bg} ${govColors.text}`}>
                      {channel.governance_profile.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {channel.allowed_platforms.map((platform) => (
                      <Badge key={platform} variant="default" size="sm">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="text-xs text-zinc-500 space-y-1">
                    <div>
                      Cadence: Max {channel.cadence_rules.max_posts_per_week || '∞'}/week
                    </div>
                    <div>
                      Schedule: {channel.default_schedule_time} {channel.default_timezone}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Archived Channels */}
      {archivedChannels.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-zinc-500 mb-4">
            Archived ({archivedChannels.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {archivedChannels.map((channel) => (
              <Card key={channel.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">{channel.name}</span>
                    <code className="text-xs text-zinc-600">{channel.product_code}</code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Channel Form Modal */}
      <ChannelFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveChannel}
        channel={editingChannel}
      />
    </div>
  );
}
