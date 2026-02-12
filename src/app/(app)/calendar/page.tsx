'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Database, HardDrive, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { fetchPosts, fetchChannels, fetchAllAssets, getStorageMode } from '@/lib/storage/posts';
import type { PublisherPost, PublisherChannel, PublisherAsset, PostStatus } from '@/lib/types/database';

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-zinc-600',
  validated: 'bg-emerald-600',
  needs_edits: 'bg-amber-600',
  blocked: 'bg-red-600',
  scheduled: 'bg-blue-600',
  published: 'bg-purple-600',
  failed: 'bg-red-800',
};

type PostWithChannel = PublisherPost & { channel_name?: string; channel_code?: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [channelFilter, setChannelFilter] = useState('');
  const [posts, setPosts] = useState<PostWithChannel[]>([]);
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [allAssets, setAllAssets] = useState<PublisherAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  // Group assets by post_id for fast lookup
  const assetsByPostId = useMemo(() => {
    const map = new Map<string, PublisherAsset[]>();
    for (const asset of allAssets) {
      if (!asset.post_id) continue;
      const list = map.get(asset.post_id) || [];
      list.push(asset);
      map.set(asset.post_id, list);
    }
    return map;
  }, [allAssets]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedPosts, loadedChannels, loadedAssets] = await Promise.all([
        fetchPosts(),
        fetchChannels(),
        fetchAllAssets(),
      ]);
      setPosts(loadedPosts);
      setChannels(loadedChannels);
      setAllAssets(loadedAssets);
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

  const channelOptions = useMemo(() => [
    { value: '', label: 'All Channels' },
    ...channels.map((c) => ({ value: c.id, label: c.name })),
  ], [channels]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (channelFilter && post.channel_id !== channelFilter) return false;
      return true;
    });
  }, [posts, channelFilter]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getPostsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return filteredPosts.filter((post) => post.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Calendar</h1>
          <p className="text-zinc-400 mt-1">
            View scheduled content across channels ({posts.length} posts)
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

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold text-white w-48 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              options={channelOptions}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-zinc-400 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-zinc-900">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-zinc-400 border-b border-zinc-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayPosts = getPostsForDay(day);

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-r border-zinc-800 ${
                  isCurrentMonth ? 'bg-zinc-950' : 'bg-zinc-900/50'
                }`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${
                    isToday
                      ? 'w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center'
                      : isCurrentMonth
                      ? 'text-zinc-300'
                      : 'text-zinc-600'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((post) => {
                    const postAssets = assetsByPostId.get(post.id) || [];
                    const firstImage = postAssets.find((a) => a.mime_type?.startsWith('image/'));

                    return (
                      <a
                        key={post.id}
                        href={`/composer/${post.id}`}
                        className={`group relative flex items-center gap-1.5 text-xs p-1 rounded ${STATUS_COLORS[post.status]} text-white hover:opacity-80 transition-opacity`}
                      >
                        {firstImage ? (
                          <img
                            src={firstImage.storage_path}
                            alt=""
                            className="w-6 h-6 rounded-sm object-cover shrink-0 ring-1 ring-white/20"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-sm shrink-0 flex items-center justify-center bg-black/20">
                            <ImageIcon className="w-3.5 h-3.5 opacity-40" />
                          </span>
                        )}
                        <span className="truncate">
                          <span className="font-medium">{post.channel_code || 'post'}</span>
                          <span className="opacity-75 ml-1">{post.content_type}</span>
                        </span>
                        {postAssets.length > 1 && (
                          <span className="ml-auto shrink-0 text-[10px] bg-black/30 rounded px-1">
                            +{postAssets.length - 1}
                          </span>
                        )}
                      </a>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div className="text-xs text-zinc-500 pl-1">
                      +{dayPosts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
