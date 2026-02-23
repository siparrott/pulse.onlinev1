'use client';

import Link from 'next/link';
import {
  Zap, ClipboardCheck, Activity, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const sections = [
  {
    href: '/automations/meta',
    title: 'Meta / Facebook Rules',
    description: 'Create and manage automation rules for Facebook Page posts — reposts, alerts, and more.',
    icon: Zap,
    color: 'text-blue-400',
  },
  {
    href: '/automations/approvals',
    title: 'Pending Approvals',
    description: 'Review and approve or reject queued automation actions before execution.',
    icon: ClipboardCheck,
    color: 'text-amber-400',
  },
  {
    href: '/automations/activity',
    title: 'Activity Log',
    description: 'Full audit trail of all automation actions — executed, blocked, and failed.',
    icon: Activity,
    color: 'text-emerald-400',
  },
];

export default function AutomationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-emerald-500" />
          Automations
        </h1>
        <p className="text-zinc-400 mt-1">
          Safe, user-approved automations for your publishing pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="border-zinc-800 hover:border-zinc-600 transition-colors h-full cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  {s.title}
                </CardTitle>
                <CardDescription className="text-xs">{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  Open <ChevronRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
