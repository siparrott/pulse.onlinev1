import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { createClient } from '@/lib/supabase/server'
import { Layers, Calendar, Upload, ListTodo, TrendingUp, AlertTriangle, PenTool, Image, FileText, Shield } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const quickActions = [
  {
    href: '/composer',
    label: 'Composer',
    description: 'Create and govern new posts',
    icon: PenTool,
  },
  {
    href: '/imports',
    label: 'CSV Import',
    description: 'Upload a 120-day content calendar',
    icon: Upload,
  },
  {
    href: '/queue',
    label: 'Queue',
    description: 'Validate and schedule pending posts',
    icon: ListTodo,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    description: 'View scheduled content across channels',
    icon: Calendar,
  },
  {
    href: '/channels',
    label: 'Channels',
    description: 'Connect social accounts and manage channels',
    icon: Layers,
  },
  {
    href: '/assets',
    label: 'Assets',
    description: 'Central gallery with role tagging and review',
    icon: Image,
  },
  {
    href: '/publishing',
    label: 'Publishing',
    description: 'Publish pipeline and dry-run simulation',
    icon: TrendingUp,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Engagement metrics and performance insights',
    icon: FileText,
  },
]

export default async function DashboardPage() {
  const { workspace, role } = await getUserWorkspace()
  const supabase = await createClient()

  // Fetch real counts
  const { count: channelCount } = await supabase
    .from('connected_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace!.id)

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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Workspace</p>
                <p className="text-lg font-bold text-white mt-1">{workspace?.name}</p>
              </div>
              <Shield className="h-10 w-10 text-emerald-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Role</p>
                <p className="text-3xl font-bold text-white mt-1">{role}</p>
              </div>
              <Layers className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Connected Channels</p>
                <p className="text-3xl font-bold text-white mt-1">{channelCount ?? 0}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Governance Engine</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">Active</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <span className="text-emerald-400">Connected</span>
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
              <span className="text-emerald-400">Google OAuth · Active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
