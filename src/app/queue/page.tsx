'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Filter, Play, CheckCheck, RefreshCw, Database, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { fetchPosts, fetchChannels, updatePost, getStorageMode } from '@/lib/storage/posts';
import type { PublisherPost, PublisherChannel, PostStatus, GovernanceStatus } from '@/lib/types/database';

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  validated: { label: 'Validated', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  needs_edits: { label: 'Needs Edits', color: 'bg-amber-500/20 text-amber-400', icon: AlertTriangle },
  blocked: { label: 'Blocked', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  published: { label: 'Published', color: 'bg-purple-500/20 text-purple-400', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

const GOVERNANCE_COLORS: Record<GovernanceStatus, string> = {
  unreviewed: 'bg-zinc-500/20 text-zinc-400',
  allowed: 'bg-emerald-500/20 text-emerald-400',
  allowed_with_edits: 'bg-amber-500/20 text-amber-400',
  blocked: 'bg-red-500/20 text-red-400',
};

type PostWithChannel = PublisherPost & { channel_name?: string; channel_code?: string };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'validated', label: 'Validated' },
  { value: 'needs_edits', label: 'Needs Edits' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'scheduled', label: 'Scheduled' },
];

export default function QueuePage() {
  const [posts, setPosts] = useState<PostWithChannel[]>([]);
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedPosts, loadedChannels] = await Promise.all([
        fetchPosts(),
        fetchChannels(),
      ]);
      setPosts(loadedPosts);
      setChannels(loadedChannels);
      setStorageMode(getStorageMode());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const channelOptions = [
    { value: '', label: 'All Channels' },
    ...channels.map((c) => ({ value: c.id, label: c.name })),
  ];

  const filteredPosts = posts.filter((post) => {
    if (channelFilter && post.channel_id !== channelFilter) return false;
    if (statusFilter && post.status !== statusFilter) return false;
    return true;
  });

  const toggleSelectPost = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map((p) => p.id));
    }
  };

  const handleValidateAll = () => {
    setPosts((prev) =>
      prev.map((post) => {
        if (!selectedPosts.includes(post.id)) return post;
        // Simulate validation - in production this calls the governance validator
        if (post.governance_status === 'blocked') return post;
        return {
          ...post,
          status: 'validated' as PostStatus,
          governance_status: 'allowed' as GovernanceStatus,
          governance_score: 100,
        };
      })
    );
    setSelectedPosts([]);
  };

  const handleScheduleAll = () => {
    setPosts((prev) =>
      prev.map((post) => {
        if (!selectedPosts.includes(post.id)) return post;
        if (post.status !== 'validated') return post;
        return {
          ...post,
          status: 'scheduled' as PostStatus,
          scheduled_at: new Date().toISOString(),
        };
      })
    );
    setSelectedPosts([]);
  };

  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const validatedCount = posts.filter((p) => p.status === 'validated').length;
  const blockedCount = posts.filter((p) => p.status === 'blocked').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Queue</h1>
          <p className="text-zinc-400 mt-1">
            Review, validate, and schedule posts ({posts.length} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {storageMode === 'local' ? (
            <Badge variant="warning" className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Local Storage
            </Badge>
          ) : (
            <Badge variant="success" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Supabase
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-zinc-400">{draftCount}</div>
            <div className="text-xs text-zinc-500">Drafts</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{validatedCount}</div>
            <div className="text-xs text-zinc-500">Validated</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-red-400">{blockedCount}</div>
            <div className="text-xs text-zinc-500">Blocked</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-zinc-500" />
              <Select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                options={channelOptions}
                className="w-48"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={STATUS_OPTIONS}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedPosts.length > 0 && (
                <>
                  <span className="text-sm text-zinc-400">
                    {selectedPosts.length} selected
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleValidateAll}>
                    <Play className="h-4 w-4 mr-1" />
                    Validate
                  </Button>
                  <Button size="sm" onClick={handleScheduleAll}>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 text-sm text-zinc-500">
          <input
            type="checkbox"
            checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-zinc-700 bg-zinc-800 text-emerald-600"
          />
          <div className="w-24">Date</div>
          <div className="w-40">Channel</div>
          <div className="flex-1">Caption</div>
          <div className="w-28">Status</div>
          <div className="w-20">Score</div>
        </div>

        {filteredPosts.map((post) => {
          const statusConfig = STATUS_CONFIG[post.status];
          const StatusIcon = statusConfig.icon;

          return (
            <Card
              key={post.id}
              className={`hover:border-zinc-700 transition-colors ${
                selectedPosts.includes(post.id) ? 'border-emerald-600' : ''
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedPosts.includes(post.id)}
                    onChange={() => toggleSelectPost(post.id)}
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-600"
                  />
                  <div className="w-24 text-sm text-zinc-400">{post.date}</div>
                  <div className="w-40">
                    <Badge variant="default">{post.channel_name || post.channel_code || 'Unknown'}</Badge>
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/composer/${post.id}`}
                      className="text-sm text-zinc-200 hover:text-white line-clamp-1"
                    >
                      {post.caption}
                    </Link>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="info" size="sm">{post.content_type}</Badge>
                      {post.platform_targets.map((p) => (
                        <Badge key={p} size="sm">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="w-28">
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="w-20 text-center">
                    <span
                      className={`text-lg font-bold ${
                        post.governance_score >= 80
                          ? 'text-emerald-400'
                          : post.governance_score >= 50
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {post.governance_score || '—'}
                    </span>
                  </div>
                </div>

                {/* Governance Issues */}
                {post.governance_refusals.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex flex-wrap gap-2">
                      {post.governance_refusals.map((refusal, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded ${
                            refusal.severity === 'error'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {refusal.message}
                        </span>
                      ))}
                    </div>
                    {post.governance_unlock_path && (
                      <p className="text-xs text-zinc-500 mt-2">
                        <span className="text-emerald-400">Fix:</span> {post.governance_unlock_path}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredPosts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              No posts match the current filters
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
