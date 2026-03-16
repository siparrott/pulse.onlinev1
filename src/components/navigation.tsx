'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  Upload,
  Calendar,
  ListTodo,
  Settings,
  Radio,
  ImagePlus,
  Send,
  BarChart3,
  Mail,
  Zap,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { signOut } from '@/app/actions/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Radio },
  { href: '/channels', label: 'Channels', icon: Layers },
  { href: '/imports', label: 'Import CSV', icon: Upload },
  { href: '/queue', label: 'Queue', icon: ListTodo },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/assets', label: 'Assets', icon: ImagePlus },
  { href: '/publishing', label: 'Publishing', icon: Send },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/digests', label: 'Digests', icon: Mail },
  { href: '/automations', label: 'Automations', icon: Zap },
];

export function Navigation({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Radio className="h-8 w-8 text-emerald-500" />
          <span className="text-xl font-bold text-white">pulse.online</span>
        </Link>
      </div>

      <div className="px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
        {userEmail && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
          </div>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
        <div className="px-3 py-2 text-xs text-zinc-600">
          Internal Use Only
        </div>
      </div>
    </nav>
  );
}
