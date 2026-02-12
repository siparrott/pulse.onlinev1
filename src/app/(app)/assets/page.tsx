'use client';

import { useState } from 'react';
import { Upload, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PublisherAsset, AssetRole, AssetQualityStatus } from '@/lib/types/database';

const QUALITY_COLORS: Record<AssetQualityStatus, string> = {
  unreviewed: 'bg-zinc-500/20 text-zinc-400',
  ok: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-400',
  blocked: 'bg-red-500/20 text-red-400',
};

const ROLE_COLORS: Record<AssetRole, string> = {
  proof: 'bg-blue-500/20 text-blue-400',
  decorative: 'bg-purple-500/20 text-purple-400',
  educational: 'bg-cyan-500/20 text-cyan-400',
  ui: 'bg-orange-500/20 text-orange-400',
};

// Demo assets
const DEMO_ASSETS: (PublisherAsset & { channel_name: string })[] = [
  {
    id: '1',
    channel_id: '1',
    channel_name: 'Infinite Authority',
    post_id: '1',
    storage_path: '/placeholder.jpg',
    filename: 'product-launch-hero.jpg',
    mime_type: 'image/jpeg',
    file_size: 245000,
    role: 'decorative',
    quality_status: 'ok',
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    channel_id: '2',
    channel_name: 'QuoteKits',
    post_id: '2',
    storage_path: '/placeholder.jpg',
    filename: 'quote-template-1.png',
    mime_type: 'image/png',
    file_size: 180000,
    role: 'decorative',
    quality_status: 'unreviewed',
    notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    channel_id: '1',
    channel_name: 'Infinite Authority',
    post_id: null,
    storage_path: '/placeholder.jpg',
    filename: 'case-study-results.png',
    mime_type: 'image/png',
    file_size: 320000,
    role: 'proof',
    quality_status: 'ok',
    notes: 'Client approved for use',
    created_at: new Date().toISOString(),
  },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: '1', label: 'Infinite Authority' },
  { value: '2', label: 'QuoteKits' },
  { value: '3', label: 'ChaosCut' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'proof', label: 'Proof' },
  { value: 'decorative', label: 'Decorative' },
  { value: 'educational', label: 'Educational' },
  { value: 'ui', label: 'UI Screenshot' },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState(DEMO_ASSETS);
  const [channelFilter, setChannelFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = assets.filter((asset) => {
    if (channelFilter && asset.channel_id !== channelFilter) return false;
    if (roleFilter && asset.role !== roleFilter) return false;
    if (searchQuery && !asset.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const asset: PublisherAsset & { channel_name: string } = {
        id: crypto.randomUUID(),
        channel_id: '1', // Default channel
        channel_name: 'Infinite Authority',
        post_id: null,
        storage_path: URL.createObjectURL(file),
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        role: 'decorative',
        quality_status: 'unreviewed',
        notes: null,
        created_at: new Date().toISOString(),
      };
      setAssets((prev) => [...prev, asset]);
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleQualityChange = (assetId: string, status: AssetQualityStatus) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, quality_status: status } : a))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Assets</h1>
          <p className="text-zinc-400 mt-1">
            Manage media assets across channels
          </p>
        </div>
        <label>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Assets
          </Button>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-zinc-500" />
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              options={CHANNEL_OPTIONS}
              className="w-48"
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={ROLE_OPTIONS}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            {/* Preview */}
            <div className="aspect-square bg-zinc-800 flex items-center justify-center">
              {asset.mime_type?.startsWith('image/') ? (
                <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-zinc-500">
                  {/* In production, show actual image */}
                  <span className="text-xs">Image Preview</span>
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">Video</div>
              )}
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm text-zinc-200 truncate" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-xs text-zinc-500">
                  {asset.channel_name} · {asset.file_size ? `${(asset.file_size / 1024).toFixed(0)} KB` : 'Unknown'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={ROLE_COLORS[asset.role]}>{asset.role}</Badge>
                <Badge className={QUALITY_COLORS[asset.quality_status]}>
                  {asset.quality_status}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQualityChange(asset.id, 'ok')}
                    className={asset.quality_status === 'ok' ? 'text-emerald-400' : ''}
                  >
                    ✓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQualityChange(asset.id, 'warning')}
                    className={asset.quality_status === 'warning' ? 'text-amber-400' : ''}
                  >
                    !
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQualityChange(asset.id, 'blocked')}
                    className={asset.quality_status === 'blocked' ? 'text-red-400' : ''}
                  >
                    ✕
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            No assets found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
