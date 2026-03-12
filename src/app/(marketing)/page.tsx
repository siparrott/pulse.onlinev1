"use client";

import React from "react";
import {
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Upload,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  LayoutDashboard,
  Wand2,
  BadgeCheck,
  Boxes,
  FileSpreadsheet,
  Eye,
  ScrollText,
  Image as ImageIcon,
} from "lucide-react";

type Governance = "STRICT" | "STANDARD" | "EXPERIMENTAL";

const CHANNELS: Array<{
  name: string;
  code: string;
  governance: Governance;
  platforms: string[];
  maxPerWeek: number;
}> = [
  { name: "Infinite Authority", code: "ia", governance: "STRICT", platforms: ["Instagram", "LinkedIn", "X"], maxPerWeek: 7 },
  { name: "ContextEmbed", code: "contextembed", governance: "STRICT", platforms: ["LinkedIn", "X"], maxPerWeek: 5 },
  { name: "SiteFixEngine", code: "sitefixengine", governance: "STRICT", platforms: ["LinkedIn", "X", "Instagram"], maxPerWeek: 7 },
  { name: "Asset Liberator", code: "assetliberator", governance: "STRICT", platforms: ["Instagram", "Facebook", "X"], maxPerWeek: 4 },
  { name: "QuoteKits", code: "quotekits", governance: "STANDARD", platforms: ["Instagram", "Pinterest", "X"], maxPerWeek: 10 },
  { name: "TogNinja", code: "togninja", governance: "STANDARD", platforms: ["Instagram", "X", "YouTube"], maxPerWeek: 7 },
  { name: "ChaosCut", code: "chaoscut", governance: "EXPERIMENTAL", platforms: ["Instagram", "TikTok", "YouTube"], maxPerWeek: 14 },
  { name: "BatchLight", code: "batchlight", governance: "EXPERIMENTAL", platforms: ["Instagram", "X", "YouTube"], maxPerWeek: 14 },
  { name: "ShootCleaner", code: "shootcleaner", governance: "EXPERIMENTAL", platforms: ["Instagram", "X", "YouTube"], maxPerWeek: 14 },
];

const PLATFORM_BADGES = [
  { label: "Instagram", hint: "Feed preview + target publishing" },
  { label: "LinkedIn", hint: "Professional post preview + target publishing" },
  { label: "X", hint: "Tweet-card preview + target publishing" },
  { label: "Facebook", hint: "Post-card preview + target publishing" },
  { label: "TikTok", hint: "Vertical preview + target publishing" },
  { label: "YouTube", hint: "Thumbnail preview + target publishing" },
  { label: "Pinterest", hint: "Pin preview + target publishing" },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Governed publishing", desc: "Three-tier engine scores every post and blocks unsafe content before it goes live." },
  { icon: Eye, title: "Live social previews", desc: "Write once. See pixel-style previews across platforms as you type." },
  { icon: FileSpreadsheet, title: "Smart CSV import", desc: "Ingest 120-day calendars with mapping, parsing, and row-level validation." },
  { icon: CalendarDays, title: "Calendar planning", desc: "Month grid, status color-coding, channel filters, and quick editing." },
  { icon: Layers, title: "Queue & bulk actions", desc: "Validate, schedule, and manage pipeline status at scale — fast." },
  { icon: ImageIcon, title: "Asset management", desc: "Central gallery with role tagging and quality review workflow." },
  { icon: ScrollText, title: "Audit trail", desc: "Every validation, import, and publish event logged with full payloads." },
  { icon: Boxes, title: "Multi-channel hub", desc: "Run 9 product channels from one governed dashboard." },
];

const governanceStyles: Record<Governance, { ring: string; label: string; sub: string; icon: React.ElementType }> = {
  STRICT: {
    ring: "ring-emerald-500/40",
    label: "STRICT",
    sub: "Flagship products. Guardrails on. No hype.",
    icon: BadgeCheck,
  },
  STANDARD: {
    ring: "ring-emerald-500/25",
    label: "STANDARD",
    sub: "Growth products. Safety first. Flex allowed.",
    icon: ShieldCheck,
  },
  EXPERIMENTAL: {
    ring: "ring-emerald-500/15",
    label: "EXPERIMENTAL",
    sub: "Creative channels. Blocks spam/scams only.",
    icon: Sparkles,
  },
};

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-none border border-zinc-700/80 bg-zinc-900/70 px-3 py-1 text-xs tracking-wide text-zinc-200">
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      className={classNames(
        "group inline-flex items-center justify-center gap-2 rounded-none px-4 py-2 text-sm font-semibold tracking-wide transition",
        variant === "primary" &&
          "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
        variant === "ghost" &&
          "border border-zinc-700 bg-zinc-900/40 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900/70"
      )}
      type="button"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-px w-10 bg-emerald-500/70" />
        <p className="text-xs font-semibold tracking-[0.25em] text-emerald-300/90">
          {eyebrow}
        </p>
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-zinc-300/90">{desc}</p>
    </div>
  );
}

function AngledCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "relative overflow-hidden rounded-none border border-zinc-800 bg-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]",
        className
      )}
    >
      {/* sharp angle overlay */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rotate-12 bg-emerald-500/10" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 -rotate-12 bg-emerald-500/5" />
      <div className="relative">{children}</div>
    </div>
  );
}

function MockAppFrame({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-none border border-zinc-800 bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
          <span className="ml-2 text-xs font-semibold tracking-wide text-zinc-200">
            {title}
          </span>
        </div>
        <span className="text-xs text-zinc-400">{subtitle}</span>
      </div>

      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <div className="col-span-4 border-r border-zinc-800 bg-zinc-950/80 p-4 sm:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-8 w-8 rounded-none bg-emerald-500/15 ring-1 ring-emerald-500/25" />
            <div>
              <div className="text-sm font-bold text-zinc-100">AxixOS</div>
              <div className="text-xs text-zinc-500">Internal v0.1.0</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100">
              <LayoutDashboard className="h-4 w-4 text-emerald-300/80" />
              Dashboard
            </div>
            {[
              { icon: Wand2, label: "Composer" },
              { icon: Layers, label: "Queue" },
              { icon: CalendarDays, label: "Calendar" },
              { icon: Upload, label: "CSV Import" },
              { icon: ImageIcon, label: "Assets" },
              { icon: ScrollText, label: "Audit Log" },
            ].map((it) => (
              <div
                key={it.label}
                className="flex items-center gap-2 px-3 py-2 text-zinc-400"
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="col-span-8 p-4 sm:col-span-9">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 rounded-none border border-zinc-800 bg-zinc-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold tracking-widest text-emerald-300/90">
                    GOVERNANCE STATUS
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-50">
                    Allowed with Edits
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Score: <span className="text-zinc-200">80</span> — missing
                    hashtags + CTA
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200">
                    <AlertTriangle className="h-4 w-4 text-emerald-300/80" />
                    Warnings
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
                    Simulated publish
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-12 grid grid-cols-12 gap-4">
              <div className="col-span-12 rounded-none border border-zinc-800 bg-zinc-900/20 p-4 md:col-span-7">
                <div className="text-xs font-semibold tracking-widest text-zinc-300">
                  COMPOSER
                </div>
                <div className="mt-3 space-y-3">
                  <div className="h-10 rounded-none border border-zinc-800 bg-zinc-950/30" />
                  <div className="h-24 rounded-none border border-zinc-800 bg-zinc-950/30" />
                  <div className="flex gap-3">
                    <div className="h-10 flex-1 rounded-none border border-zinc-800 bg-zinc-950/30" />
                    <div className="h-10 w-24 rounded-none border border-zinc-800 bg-zinc-950/30" />
                  </div>
                  <div className="h-10 rounded-none border border-zinc-800 bg-zinc-950/30" />
                </div>
              </div>

              <div className="col-span-12 rounded-none border border-zinc-800 bg-zinc-900/20 p-4 md:col-span-5">
                <div className="text-xs font-semibold tracking-widest text-zinc-300">
                  LIVE PREVIEW
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {["Instagram", "LinkedIn", "X", "TikTok"].map((p) => (
                    <div
                      key={p}
                      className="h-24 rounded-none border border-zinc-800 bg-zinc-950/30 p-3"
                    >
                      <div className="text-xs font-semibold text-zinc-200">{p}</div>
                      <div className="mt-2 h-2 w-2/3 bg-zinc-800" />
                      <div className="mt-2 h-2 w-1/2 bg-zinc-800" />
                      <div className="mt-3 h-8 bg-zinc-900/40 ring-1 ring-emerald-500/10" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-10 rounded-none border border-zinc-800 bg-zinc-950/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* angled glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.18),transparent_45%)]" />
    </div>
  );
}

export default function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Angled background grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.20]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(63,63,70,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.3)_1px,transparent_1px)] bg-size-[56px_56px]" />
        <div className="absolute -top-40 left-1/2 h-130 w-225 -translate-x-1/2 rotate-6 bg-emerald-500/8 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-130 w-225 -translate-x-1/2 -rotate-6 bg-emerald-500/6 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-900/80 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-none bg-emerald-500/15 ring-1 ring-emerald-500/30" />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">AxixOS</div>
              <div className="text-xs text-zinc-400">Governed publishing system</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Chip>
              <ShieldCheck className="h-4 w-4 text-emerald-300/90" />
              Internal v0.1.0
            </Chip>
            <Chip>
              <CheckCircle2 className="h-4 w-4 text-emerald-300/90" />
              Dry-run publishing
            </Chip>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-6xl grid-cols-12 gap-8 px-6 pb-10 pt-12 sm:pt-16">
          <div className="col-span-12 md:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
              <Sparkles className="h-4 w-4 text-emerald-300/90" />
              Plan • Govern • Publish across 9 channels
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">
              Governed content publishing.
              <span className="block text-emerald-300/90">Brand-safe by default.</span>
            </h1>

            <p className="mt-5 max-w-xl text-zinc-300/90">
              AxixOS is the internal system that keeps multi-channel publishing
              under control — with a governance engine that scores every post and
              blocks spam, scams, and risky language before it ships.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary">
                Open Composer Mock
              </Button>
              <Button variant="ghost">
                View Governance Tiers
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Chip>9 channels</Chip>
              <Chip>7 platform previews</Chip>
              <Chip>CSV import</Chip>
              <Chip>Queue + calendar</Chip>
              <Chip>Audit logs</Chip>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <MockAppFrame title="AxixOS" subtitle="Composer + Preview + Governance" />
          </div>
        </div>
      </section>

      {/* Problem / solution strip */}
      <section className="relative z-10 border-y border-zinc-900/80 bg-zinc-950/40">
        <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-10">
          <div className="col-span-12 md:col-span-4">
            <AngledCard>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-9 w-9 rounded-none bg-emerald-500/15 ring-1 ring-emerald-500/25" />
                <div>
                  <div className="text-sm font-bold text-zinc-50">The reality</div>
                  <p className="mt-1 text-sm text-zinc-300/90">
                    9 products. Multiple platforms. Different rules. One sloppy post can
                    trash trust across the whole suite.
                  </p>
                </div>
              </div>
            </AngledCard>
          </div>
          <div className="col-span-12 md:col-span-4">
            <AngledCard>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-9 w-9 rounded-none bg-emerald-500/15 ring-1 ring-emerald-500/25" />
                <div>
                  <div className="text-sm font-bold text-zinc-50">AxixOS fix</div>
                  <p className="mt-1 text-sm text-zinc-300/90">
                    Governance-first publishing. Every post gets scored, classified,
                    and given an unlock path when blocked.
                  </p>
                </div>
              </div>
            </AngledCard>
          </div>
          <div className="col-span-12 md:col-span-4">
            <AngledCard>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-9 w-9 rounded-none bg-emerald-500/15 ring-1 ring-emerald-500/25" />
                <div>
                  <div className="text-sm font-bold text-zinc-50">Outcome</div>
                  <p className="mt-1 text-sm text-zinc-300/90">
                    Faster publishing. Less risk. Cleaner cadence. Auditable actions —
                    ready for future connectors.
                  </p>
                </div>
              </div>
            </AngledCard>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="GOVERNANCE ENGINE"
            title="Three tiers. One scoring system."
            desc="Every post starts at 100. Errors deduct 25 points. Warnings deduct 10. AxixOS then classifies the post and tells you exactly what to fix."
          />

          <div className="mt-8 grid grid-cols-12 gap-6">
            {(["STRICT", "STANDARD", "EXPERIMENTAL"] as Governance[]).map((g) => {
              const meta = governanceStyles[g];
              const Icon = meta.icon;
              return (
                <div key={g} className="col-span-12 md:col-span-4">
                  <div className={classNames("rounded-none border border-zinc-800 bg-zinc-950/40 p-6 ring-1", meta.ring)}>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-emerald-300/90">
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </div>
                      <div className="text-xs text-zinc-500">Score-based</div>
                    </div>
                    <p className="mt-3 text-sm text-zinc-300/90">{meta.sub}</p>

                    <div className="mt-5 space-y-2 text-sm">
                      {g === "STRICT" && (
                        <>
                          <RuleRow ok label="Blocks spam & scams" />
                          <RuleRow ok label="Blocks hype language" />
                          <RuleRow ok label="Blocks competitor comparisons" />
                          <RuleRow warn label="Requires CTA + hashtags + images" />
                        </>
                      )}
                      {g === "STANDARD" && (
                        <>
                          <RuleRow ok label="Blocks spam & scams" />
                          <RuleRow warn label="Soft warnings on hype/guarantees" />
                          <RuleRow warn label="Image requirements by type" />
                          <RuleRow ok label="Flexible copy allowed" />
                        </>
                      )}
                      {g === "EXPERIMENTAL" && (
                        <>
                          <RuleRow ok label="Blocks spam & scams" />
                          <RuleRow ok label="Creative freedom otherwise" />
                          <RuleRow warn label="Still logs every decision" />
                          <RuleRow ok label="Fast iteration mode" />
                        </>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
                      <MiniState icon={CheckCircle2} label="Allowed" />
                      <MiniState icon={AlertTriangle} label="Edits" />
                      <MiniState icon={XCircle} label="Blocked" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-none border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-zinc-50">Unlock paths</div>
                <p className="mt-1 text-sm text-zinc-300/90">
                  When a post is blocked, AxixOS doesn&apos;t just refuse — it tells you what to do next:
                  &quot;Remove hype language&quot;, &quot;Add CTA&quot;, &quot;Upload required image&quot;, etc.
                </p>
              </div>
              <div className="flex gap-2">
                <Chip>
                  <XCircle className="h-4 w-4 text-emerald-300/80" />
                  Blocked → Fix instructions
                </Chip>
                <Chip>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
                  Allowed → Schedule
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform preview matrix */}
      <section className="relative z-10 border-y border-zinc-900/80 bg-zinc-950/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="LIVE PREVIEWS"
            title="Write once. Preview everywhere."
            desc="See how your post renders across platforms while you write. The governance panel stays live on the side — no surprises."
          />

          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7">
              <AngledCard>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-zinc-50">Preview tiles</div>
                  <div className="text-xs text-zinc-500">Instagram • LinkedIn • X • TikTok • YouTube • Facebook • Pinterest</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PLATFORM_BADGES.map((p) => (
                    <div
                      key={p.label}
                      className="rounded-none border border-zinc-800 bg-zinc-950/30 p-4"
                    >
                      <div className="text-xs font-semibold text-zinc-200">{p.label}</div>
                      <div className="mt-2 h-2 w-2/3 bg-zinc-800" />
                      <div className="mt-2 h-2 w-1/2 bg-zinc-800" />
                      <div className="mt-3 h-10 bg-zinc-900/40 ring-1 ring-emerald-500/10" />
                      <div className="mt-3 text-[11px] text-zinc-500">{p.hint}</div>
                    </div>
                  ))}
                </div>
              </AngledCard>
            </div>

            <div className="col-span-12 md:col-span-5">
              <AngledCard>
                <div className="text-sm font-bold text-zinc-50">Why it matters</div>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300/80" />
                    Avoid &quot;looks fine in the editor, breaks on platform&quot; moments.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300/80" />
                    Governance keeps you out of hype/claims traps.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300/80" />
                    Faster approvals — fewer back-and-forth edits.
                  </li>
                </ul>

                <div className="mt-6 rounded-none border border-zinc-800 bg-zinc-950/30 p-4">
                  <div className="text-xs font-semibold tracking-widest text-emerald-300/90">
                    PREVIEW STACK
                  </div>
                  <p className="mt-2 text-sm text-zinc-300/90">
                    Composer + governance panel + multi-platform previews — one workflow.
                  </p>
                </div>
              </AngledCard>
            </div>
          </div>
        </div>
      </section>

      {/* Import & plan */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="IMPORT & PLAN"
            title="Bulk ingest 120-day calendars in minutes."
            desc="CSV import wizard with auto-mapping, smart parsing, and row-level validation — then schedule into your queue and calendar."
          />

          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6">
              <AngledCard>
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-50">
                  <Upload className="h-4 w-4 text-emerald-300/80" />
                  CSV Import Wizard
                </div>
                <ol className="mt-4 space-y-3 text-sm text-zinc-300/90">
                  {[
                    "Select Channel",
                    "Upload CSV",
                    "Map Columns (auto-detect)",
                    "Preview & Validate (row errors)",
                    "Complete (bulk drafts)",
                  ].map((s, idx) => (
                    <li key={s} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-none border border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-200">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-zinc-200">{s}</div>
                        <div className="mt-1 text-zinc-500">
                          {idx === 2 && "Aliases supported: ig, insta, x, fb, li, tt, yt, pin"}
                          {idx === 3 && "Detects US/EU/ISO dates, quotes, multi-line fields"}
                          {(idx !== 2 && idx !== 3) && "Guided, fast, no surprises"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex gap-2">
                  <Chip>Sample CSV template</Chip>
                  <Chip>Row numbers on errors</Chip>
                </div>
              </AngledCard>
            </div>

            <div className="col-span-12 md:col-span-6">
              <AngledCard>
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-50">
                  <CalendarDays className="h-4 w-4 text-emerald-300/80" />
                  Calendar View
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-xs">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d)=>(
                    <div key={d} className="py-2 text-center text-zinc-500">{d}</div>
                  ))}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const status = i % 6;
                    const statusClass =
                      status === 0 ? "bg-zinc-900/40" :
                      status === 1 ? "bg-emerald-500/15 ring-1 ring-emerald-500/20" :
                      status === 2 ? "bg-emerald-500/10 ring-1 ring-emerald-500/10" :
                      status === 3 ? "bg-red-500/10 ring-1 ring-red-500/20" :
                      status === 4 ? "bg-blue-500/10 ring-1 ring-blue-500/20" :
                                   "bg-purple-500/10 ring-1 ring-purple-500/20";
                    return (
                      <div
                        key={i}
                        className={classNames(
                          "h-16 rounded-none border border-zinc-800 p-2",
                          statusClass
                        )}
                      >
                        <div className="text-zinc-400">{(i % 30) + 1}</div>
                        <div className="mt-2 h-2 w-2/3 bg-zinc-800/70" />
                        <div className="mt-1 h-2 w-1/2 bg-zinc-800/70" />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Chip>Draft</Chip>
                  <Chip>Validated</Chip>
                  <Chip>Needs edits</Chip>
                  <Chip>Blocked</Chip>
                  <Chip>Scheduled</Chip>
                  <Chip>Published</Chip>
                </div>
              </AngledCard>
            </div>
          </div>
        </div>
      </section>

      {/* Channels grid */}
      <section className="relative z-10 border-y border-zinc-900/80 bg-zinc-950/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="CHANNELS"
            title="9 product channels. Each with its own rules."
            desc="Governance profile, allowed platforms, and posting cadence are enforced per channel — automatically."
          />

          <div className="mt-8 grid grid-cols-12 gap-4">
            {CHANNELS.map((c) => {
              const meta = governanceStyles[c.governance];
              return (
                <div key={c.code} className="col-span-12 md:col-span-4">
                  <div className={classNames("rounded-none border border-zinc-800 bg-zinc-950/40 p-5 ring-1", meta.ring)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-zinc-50">{c.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">/{c.code}</div>
                      </div>
                      <span className="rounded-none border border-zinc-800 bg-zinc-950/30 px-2 py-1 text-xs font-semibold tracking-widest text-emerald-300/90">
                        {c.governance}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold tracking-widest text-zinc-400">PLATFORMS</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.platforms.map((p) => (
                          <span key={p} className="rounded-none border border-zinc-800 bg-zinc-950/30 px-2 py-1 text-xs text-zinc-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Max posts/week</span>
                      <span className="font-bold text-zinc-100">{c.maxPerWeek}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-none border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-zinc-50">Cadence enforcement</div>
                <p className="mt-1 text-sm text-zinc-300/90">
                  AxixOS enforces max posts/week and spacing rules per channel — so you don&apos;t accidentally spam or drift.
                </p>
              </div>
              <Chip>
                <Layers className="h-4 w-4 text-emerald-300/80" />
                Per-channel rules, enforced
              </Chip>
            </div>
          </div>
        </div>
      </section>

      {/* Content lifecycle */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="WORKFLOW"
            title="A clean lifecycle from draft → publish."
            desc="Draft content, validate with governance, schedule, and run publish simulation — every step logged."
          />

          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7">
              <AngledCard>
                <div className="text-sm font-bold text-zinc-50">Lifecycle diagram</div>
                <div className="mt-5 grid grid-cols-12 gap-3 text-sm">
                  <FlowNode col="col-span-12 sm:col-span-3" label="DRAFT" sub="Create or import" tone="neutral" />
                  <FlowArrow />
                  <FlowNode col="col-span-12 sm:col-span-3" label="VALIDATE" sub="Score + classify" tone="emerald" />
                  <FlowArrow />
                  <FlowNode col="col-span-12 sm:col-span-3" label="SCHEDULE" sub="Calendar + queue" tone="blue" />
                  <FlowArrow />
                  <FlowNode col="col-span-12 sm:col-span-3" label="PUBLISH" sub="Dry run (v1)" tone="purple" />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <StatusCard icon={CheckCircle2} title="Allowed" desc="Ready to schedule" />
                  <StatusCard icon={AlertTriangle} title="Allowed with edits" desc="Warnings only" />
                  <StatusCard icon={XCircle} title="Blocked" desc="Fix required" />
                </div>
              </AngledCard>
            </div>

            <div className="col-span-12 md:col-span-5">
              <AngledCard>
                <div className="text-sm font-bold text-zinc-50">Audit trail by default</div>
                <p className="mt-2 text-sm text-zinc-300/90">
                  Every validation, CSV import, and publish attempt gets logged with a JSON payload so you can trace decisions later.
                </p>

                <div className="mt-5 space-y-3 text-xs">
                  {[
                    { t: "validation", d: "score=80 warnings=2 missing CTA/hashtags" },
                    { t: "csv_import", d: "rows=120 valid=117 invalid=3 (date format)" },
                    { t: "dry_run_publish", d: "platforms=IG,LI,X status=ok" },
                    { t: "publish", d: "reserved for connector phase" },
                  ].map((row) => (
                    <div key={row.t} className="rounded-none border border-zinc-800 bg-zinc-950/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold tracking-widest text-emerald-300/90">{row.t}</span>
                        <span className="text-zinc-500">JSON stored</span>
                      </div>
                      <div className="mt-2 text-zinc-400">{row.d}</div>
                    </div>
                  ))}
                </div>
              </AngledCard>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 border-y border-zinc-900/80 bg-zinc-950/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionTitle
            eyebrow="FEATURES"
            title="Everything you need to ship safely."
            desc="Composer, queue, calendar, assets, CSV import, governance, and audit logging — built as one system."
          />

          <div className="mt-8 grid grid-cols-12 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="col-span-12 md:col-span-6">
                  <div className="rounded-none border border-zinc-800 bg-zinc-950/40 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-none bg-emerald-500/15 p-2 ring-1 ring-emerald-500/25">
                        <Icon className="h-4 w-4 text-emerald-300/90" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-50">{f.title}</div>
                        <p className="mt-1 text-sm text-zinc-300/90">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-none border border-zinc-800 bg-zinc-950/40 p-6">
            <div>
              <div className="text-sm font-bold text-zinc-50">Built for internal speed — ready for launch later.</div>
              <p className="mt-1 text-sm text-zinc-300/90">
                Start private. Prove the workflow. Then flip it into a product with connectors + auth when you&apos;re ready.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="primary">Start with CSV import</Button>
              <Button variant="ghost">Jump to Queue</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900/80 bg-zinc-950/70">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-zinc-100">AxixOS</div>
              <div className="mt-1 text-sm text-zinc-400">
                Governed publishing for multi-channel teams.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip>Composer</Chip>
              <Chip>Governance</Chip>
              <Chip>Queue</Chip>
              <Chip>Calendar</Chip>
              <Chip>CSV Import</Chip>
              <Chip>Audit Logs</Chip>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-500">
              Internal build • v0.1.0 • Dry-run publishing • Dark UI • Sharp-corner system
            </div>
            <div className="flex items-center gap-4 text-xs">
              <a
                href="https://axixos.com/terms"
                className="text-zinc-500 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300 hover:decoration-emerald-500/40"
              >
                Terms of Service
              </a>
              <span className="text-zinc-700">•</span>
              <a
                href="https://axixos.com/privacy"
                className="text-zinc-500 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300 hover:decoration-emerald-500/40"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RuleRow({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok && <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300/80" />}
      {warn && <AlertTriangle className="mt-0.5 h-4 w-4 text-emerald-300/80" />}
      {!ok && !warn && <XCircle className="mt-0.5 h-4 w-4 text-zinc-500" />}
      <span className="text-zinc-300/90">{label}</span>
    </div>
  );
}

function MiniState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/30 px-3 py-2">
      <Icon className="h-4 w-4 text-emerald-300/80" />
      <span className="text-zinc-200">{label}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center sm:col-span-1 sm:flex">
      <ArrowRight className="h-5 w-5 text-emerald-300/60" />
    </div>
  );
}

function FlowNode({
  label,
  sub,
  tone,
  col,
}: {
  label: string;
  sub: string;
  tone: "neutral" | "emerald" | "blue" | "purple";
  col: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "ring-1 ring-emerald-500/25"
      : tone === "blue"
      ? "ring-1 ring-blue-500/25"
      : tone === "purple"
      ? "ring-1 ring-purple-500/25"
      : "ring-1 ring-zinc-700/40";

  return (
    <div className={classNames(col, "rounded-none border border-zinc-800 bg-zinc-950/30 p-4", toneClass)}>
      <div className="text-xs font-semibold tracking-widest text-zinc-300">{label}</div>
      <div className="mt-1 text-sm text-zinc-400">{sub}</div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-none border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-300/80" />
        <div className="text-sm font-bold text-zinc-50">{title}</div>
      </div>
      <div className="mt-1 text-sm text-zinc-400">{desc}</div>
    </div>
  );
}
