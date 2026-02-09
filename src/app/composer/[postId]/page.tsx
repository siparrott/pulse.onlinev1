'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Trash2, Save, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PublisherPost, PublisherAsset, AssetRole, GovernanceStatus } from '@/lib/types/database';

const ASSET_ROLE_OPTIONS = [
  { value: 'decorative', label: 'Decorative' },
  { value: 'proof', label: 'Proof (for claims)' },
  { value: 'educational', label: 'Educational' },
  { value: 'ui', label: 'UI Screenshot' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'static', label: 'Static Image' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'reel', label: 'Reel/Video' },
  { value: 'text', label: 'Text Only' },
];

const PLATFORM_OPTIONS = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'pinterest'];

// Demo post data
const DEMO_POST: PublisherPost & { channel_name: string } = {
  id: '1',
  channel_id: '1',
  channel_name: 'Infinite Authority',
  date: '2026-02-10',
  scheduled_at: null,
  platform_targets: ['instagram', 'linkedin'],
  content_type: 'static',
  theme: 'Product Launch',
  caption: 'Introducing our newest feature - designed to help you work smarter, not harder.',
  cta: 'Learn more at ia.example.com',
  hashtags: '#productivity #workflow #infiniteauthority',
  status: 'draft',
  governance_status: 'unreviewed',
  governance_score: 0,
  governance_refusals: [],
  governance_unlock_path: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_ASSETS: PublisherAsset[] = [];

export default function ComposerPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState(DEMO_POST);
  const [assets, setAssets] = useState<PublisherAsset[]>(DEMO_ASSETS);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleFieldChange = (field: keyof PublisherPost, value: string | string[]) => {
    setPost((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlatformToggle = (platform: string) => {
    const platforms = post.platform_targets as string[];
    const updated = platforms.includes(platform)
      ? platforms.filter((p) => p !== platform)
      : [...platforms, platform];
    handleFieldChange('platform_targets', updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Create preview assets
    for (const file of Array.from(files)) {
      const asset: PublisherAsset = {
        id: crypto.randomUUID(),
        channel_id: post.channel_id,
        post_id: post.id,
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

  const handleAssetRoleChange = (assetId: string, role: AssetRole) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, role } : a))
    );
  };

  const handleRemoveAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
  };

  const handleValidate = async () => {
    setValidating(true);
    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Check for issues based on content
    const refusals: typeof post.governance_refusals = [];
    
    if (!post.cta?.trim()) {
      refusals.push({ rule: 'cta_required', message: 'CTA is required for STRICT channels', severity: 'error' });
    }
    if (!post.hashtags?.trim()) {
      refusals.push({ rule: 'hashtags_required', message: 'Hashtags are required for STRICT channels', severity: 'error' });
    }
    if (/\b(guarantee|revolutionary|best)\b/i.test(post.caption)) {
      refusals.push({ rule: 'no_hype', message: 'Hype language detected in caption', severity: 'error' });
    }
    if ((post.content_type === 'static' || post.content_type === 'carousel') && assets.length === 0) {
      refusals.push({ rule: 'image_required', message: 'Image required for static/carousel posts', severity: 'error' });
    }

    const score = Math.max(0, 100 - refusals.filter(r => r.severity === 'error').length * 25);
    const status: GovernanceStatus = refusals.some(r => r.severity === 'error')
      ? 'blocked'
      : refusals.length > 0
      ? 'allowed_with_edits'
      : 'allowed';

    setPost((prev) => ({
      ...prev,
      governance_status: status,
      governance_score: score,
      governance_refusals: refusals,
      status: status === 'allowed' ? 'validated' : status === 'blocked' ? 'blocked' : 'needs_edits',
    }));
    
    setValidating(false);
  };

  const getStatusIcon = () => {
    switch (post.governance_status) {
      case 'allowed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'allowed_with_edits':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/queue">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Post</h1>
            <p className="text-zinc-400 text-sm">{post.channel_name} · {post.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleValidate} disabled={validating}>
            <Play className="h-4 w-4 mr-2" />
            {validating ? 'Validating...' : 'Validate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="col-span-2 space-y-6">
          {/* Caption */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Caption"
                value={post.caption}
                onChange={(e) => handleFieldChange('caption', e.target.value)}
                rows={6}
                placeholder="Write your post caption..."
              />
              <div className="flex justify-end text-xs text-zinc-500">
                {post.caption.length} / 2200
              </div>

              <Input
                label="Call to Action"
                value={post.cta || ''}
                onChange={(e) => handleFieldChange('cta', e.target.value)}
                placeholder="e.g., Learn more at example.com"
              />

              <Input
                label="Hashtags"
                value={post.hashtags || ''}
                onChange={(e) => handleFieldChange('hashtags', e.target.value)}
                placeholder="#tag1 #tag2 #tag3"
              />
            </CardContent>
          </Card>

          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Media Assets</CardTitle>
              <CardDescription>
                Upload images or videos for this post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors">
                <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400">Click to upload</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Asset List */}
              {assets.length > 0 && (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg"
                    >
                      {asset.mime_type?.startsWith('image/') && (
                        <img
                          src={asset.storage_path}
                          alt={asset.filename}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200">{asset.filename}</p>
                        <p className="text-xs text-zinc-500">
                          {asset.file_size ? `${(asset.file_size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <Select
                        value={asset.role}
                        onChange={(e) => handleAssetRoleChange(asset.id, e.target.value as AssetRole)}
                        options={ASSET_ROLE_OPTIONS}
                        className="w-36"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAsset(asset.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Governance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Governance
                {getStatusIcon()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Status</span>
                  <Badge
                    variant={
                      post.governance_status === 'allowed'
                        ? 'success'
                        : post.governance_status === 'blocked'
                        ? 'error'
                        : post.governance_status === 'allowed_with_edits'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {post.governance_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Score</span>
                  <span
                    className={`text-xl font-bold ${
                      post.governance_score >= 80
                        ? 'text-emerald-400'
                        : post.governance_score >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {post.governance_score}
                  </span>
                </div>

                {post.governance_refusals.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    {post.governance_refusals.map((refusal, i) => (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded ${
                          refusal.severity === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {refusal.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Post Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={post.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />

              <Select
                label="Content Type"
                value={post.content_type}
                onChange={(e) => handleFieldChange('content_type', e.target.value)}
                options={CONTENT_TYPE_OPTIONS}
              />

              <Input
                label="Theme"
                value={post.theme || ''}
                onChange={(e) => handleFieldChange('theme', e.target.value)}
                placeholder="e.g., Product Launch"
              />

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handlePlatformToggle(platform)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        post.platform_targets.includes(platform as any)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
