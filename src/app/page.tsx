import { Layers, Calendar, Upload, ListTodo, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  { label: 'Active Channels', value: '9', icon: Layers, color: 'text-emerald-500' },
  { label: 'Posts This Week', value: '—', icon: Calendar, color: 'text-blue-500' },
  { label: 'Pending Review', value: '—', icon: AlertTriangle, color: 'text-amber-500' },
  { label: 'Published', value: '—', icon: TrendingUp, color: 'text-purple-500' },
];

const quickActions = [
  {
    href: '/imports',
    label: 'Import Calendar',
    description: 'Upload a 120-day content calendar CSV',
    icon: Upload,
  },
  {
    href: '/channels',
    label: 'Manage Channels',
    description: 'Configure product channels and governance',
    icon: Layers,
  },
  {
    href: '/queue',
    label: 'Review Queue',
    description: 'Validate and schedule pending posts',
    icon: ListTodo,
  },
  {
    href: '/calendar',
    label: 'View Calendar',
    description: 'See scheduled content across channels',
    icon: Calendar,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          Internal publishing system for multi-channel content governance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-10 w-10 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:border-zinc-700 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <action.icon className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle>{action.label}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Publishing engine health and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Database Connection</span>
              <span className="text-amber-400">Configure Supabase →</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Governance Engine</span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Publishing Mode</span>
              <span className="text-blue-400">Dry Run</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-400">Authentication</span>
              <span className="text-zinc-500">Disabled (Internal Only)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="border-emerald-800 bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-emerald-400">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="text-zinc-300 space-y-2">
          <p>1. Configure Supabase environment variables in <code className="text-emerald-400">.env.local</code></p>
          <p>2. Run the database schema: <code className="text-emerald-400">supabase/schema.sql</code></p>
          <p>3. Seed initial channels: <code className="text-emerald-400">supabase/seed.sql</code></p>
          <p>4. Import your first 120-day calendar via CSV</p>
        </CardContent>
      </Card>
    </div>
  );
}
