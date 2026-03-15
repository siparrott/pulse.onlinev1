import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30" />
            <h1 className="text-2xl font-bold text-zinc-100">Welcome to AxixOS</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Signed in as {user.email}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-zinc-200">Get started</h2>
            <p className="text-sm text-zinc-400">
              AxixOS is your governed multi-channel publishing system. Here's what you can do:
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Configure your <strong className="text-zinc-200">channels</strong> and governance profiles</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Import a <strong className="text-zinc-200">120-day content calendar</strong> via CSV</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                <span>Review, validate, and <strong className="text-zinc-200">publish</strong> across platforms</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/channels"
              className="flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
            >
              Set Up Channels First
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
