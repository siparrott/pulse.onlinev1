'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">
          System configuration and status
        </p>
      </div>

      {/* Database Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Database Connection</CardTitle>
          <CardDescription>
            Supabase configuration status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-400">NEXT_PUBLIC_SUPABASE_URL</span>
            <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'success' : 'warning'}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not Set'}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'success' : 'warning'}>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Not Set'}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500">
            Configure these in your <code className="text-emerald-400">.env.local</code> file.
          </p>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Version</span>
              <span className="text-zinc-200">0.1.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Environment</span>
              <span className="text-zinc-200">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Publishing Mode</span>
              <Badge variant="info">Dry Run Only</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-400">Authentication</span>
              <Badge>Disabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance Profiles Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Governance Profiles</CardTitle>
          <CardDescription>
            Quick reference for governance rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-2">STRICT</h4>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• No hype language (guaranteed, revolutionary, etc.)</li>
              <li>• No unproven comparisons</li>
              <li>• Mandatory CTA and hashtags</li>
              <li>• Image required for static/carousel</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">STANDARD</h4>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Softer language allowed</li>
              <li>• Benefits OK, no guarantees</li>
              <li>• Image recommended</li>
              <li>• Still blocks spam/scams</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <h4 className="font-semibold text-purple-400 mb-2">EXPERIMENTAL</h4>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Creative language allowed</li>
              <li>• Relaxed requirements</li>
              <li>• Only blocks spam and scam patterns</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-200">Export All Posts</p>
              <p className="text-sm text-zinc-500">Download posts as CSV</p>
            </div>
            <Button variant="secondary" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-200">View Governance Logs</p>
              <p className="text-sm text-zinc-500">Audit trail of all decisions</p>
            </div>
            <Button variant="secondary" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
