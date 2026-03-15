'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PenTool, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchPosts, fetchChannels } from '@/lib/storage/posts';
import type { PublisherPost, PublisherChannel, PostStatus } from '@/lib/types/database';

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  validated: { label: 'Validated', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  needs_edits: { label: 'Needs Edits', color: 'bg-amber-500/20 text-amber-400', icon: AlertTriangle },
  blocked: { label: 'Blocked', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  published: { label: 'Published', color: 'bg-purple-500/20 text-purple-400', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

type PostWithChannel = PublisherPost & { channel_name?: string };

export default function ComposerIndexPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithChannel[]>([]);
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [loadedPosts, loadedChannels] = await Promise.all([
          fetchPosts(),
          fetchChannels(),
        ]);
        setPosts(loadedPosts);
        setChannels(loadedChannels);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNewPost = () => {
    const id = crypto.randomUUID();
    router.push(`/composer/${id}`);
  };

  const drafts = posts.filter(p => p.status === 'draft' || p.status === 'needs_edits');
  const recent = posts.slice(0, 20);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <PenTool className="w-8 h-8 text-emerald-400" />
            Content Composer
          </h1>
          <p className="text-zinc-400 mt-1">Create, edit, and govern posts with live social previews</p>
        </div>
        <Button onClick={handleNewPost} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          New Post
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <>
          {/* Drafts needing attention */}
          {drafts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Drafts & Posts Needing Edits</h2>
              <div className="grid gap-3">
                {drafts.map(post => {
                  const StatusIcon = STATUS_CONFIG[post.status]?.icon || Clock;
                  const statusStyle = STATUS_CONFIG[post.status];
                  return (
                    <Link key={post.id} href={`/composer/${post.id}`}>
                      <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusStyle?.color?.split(' ')[1] || 'text-zinc-400'}`} />
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">
                                {post.caption ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '…' : '') : 'Untitled post'}
                              </p>
                              <p className="text-zinc-500 text-sm">
                                {post.channel_name || 'No channel'} · {post.date || 'No date'} · {post.content_type}
                              </p>
                            </div>
                          </div>
                          <Badge className={statusStyle?.color}>{statusStyle?.label}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* All recent posts */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              {drafts.length > 0 ? 'All Recent Posts' : 'Posts'}
              <span className="text-zinc-500 font-normal ml-2">({posts.length} total)</span>
            </h2>
            {recent.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <PenTool className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
                  <p className="text-zinc-400 mb-6">Create your first post or import content via CSV.</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleNewPost}>
                      <Plus className="w-4 h-4 mr-2" /> New Post
                    </Button>
                    <Link href="/imports">
                      <Button variant="secondary">CSV Import</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {recent.map(post => {
                  const StatusIcon = STATUS_CONFIG[post.status]?.icon || Clock;
                  const statusStyle = STATUS_CONFIG[post.status];
                  return (
                    <Link key={post.id} href={`/composer/${post.id}`}>
                      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusStyle?.color?.split(' ')[1] || 'text-zinc-400'}`} />
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">
                                {post.caption ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '…' : '') : 'Untitled post'}
                              </p>
                              <p className="text-zinc-500 text-sm">
                                {post.channel_name || 'No channel'} · {post.date || 'No date'} · {post.content_type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {post.platform_targets?.length > 0 && (
                              <span className="text-zinc-500 text-xs">{post.platform_targets.join(', ')}</span>
                            )}
                            <Badge className={statusStyle?.color}>{statusStyle?.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
