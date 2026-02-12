# Pulse.Online — Marketing Handoff Document

> **For**: Homepage design team
> **Version**: 0.1.0
> **Date**: February 10, 2026
> **Status**: Internal product — not customer-facing

---

## 1. Product Positioning

**Pulse.Online** is an internal, governed publishing system for multi-channel content management. It lets teams plan, validate, schedule, and publish social content across **9 product channels** — each with its own brand rules, platforms, and cadence — all enforced automatically by a built-in governance engine.

### One-Liner
> Plan, govern, and publish content across every product channel — with brand-safe guardrails built in.

---

## 2. Core Capabilities

### 2.1 Multi-Channel Management
- **9 product channels**, each independently configured
- Per-channel platform whitelists (Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Pinterest)
- Per-channel posting cadence rules (max posts/week, minimum days between posts, preferred days)
- Per-channel asset requirements (image requirements for static/carousel content, minimum quality thresholds)
- Channel statuses: Private, Beta, Public
- Soft-archive channels without data loss

### 2.2 Three-Tier Governance Engine
Every piece of content is automatically scored and classified before it can be published.

| Profile | Use Case | What It Enforces |
|---|---|---|
| **STRICT** | Flagship products | No hype language, no competitor comparisons, mandatory CTA & hashtags, required images, spam/scam blocking |
| **STANDARD** | Growth products | Spam/scam blocking, soft warnings for guarantees & missing images, benefits language allowed |
| **EXPERIMENTAL** | Creative/emerging products | Only blocks spam & scams — full creative freedom otherwise |

**Governance scoring**: Every post starts at 100. Errors deduct 25 points, warnings deduct 10. Posts are classified as:
- ✅ **Allowed** — ready to publish
- ⚠️ **Allowed with Edits** — warnings only, can still proceed
- ❌ **Blocked** — must fix errors before publishing

**Unlock paths**: When a post is blocked, the system generates plain-language fix instructions (e.g., "Remove hype language", "Add a clear call-to-action", "Upload a required image asset").

### 2.3 Content Composer
- Full post editor with caption (up to 2,200 characters), CTA, and hashtag fields
- Content type selection: Static, Carousel, Reel, Text
- Date picker and platform targeting (toggle per platform)
- Drag-and-drop media upload with per-asset role tagging (Decorative, Proof, Educational, UI)
- **Live social preview** — see exactly how the post will render on:
  - Twitter/X (tweet card with engagement actions)
  - Instagram (feed post with stories-style avatar ring)
  - LinkedIn (professional post with company branding)
  - Facebook (post card with engagement bar)
  - TikTok (vertical 9:16 video overlay)
  - YouTube (16:9 thumbnail with play button)
  - Pinterest (pin card with save button)
- Inline governance panel — real-time validation status, score, and refusal details

### 2.4 CSV Import (120-Day Calendar)
A 5-step guided wizard for bulk content ingestion:

1. **Select Channel** — pick the target product channel
2. **Upload** — drag-and-drop CSV file
3. **Map Columns** — smart auto-mapping with alias recognition (e.g., "Copy" → Caption, "Publish Date" → Date, "ig" → Instagram)
4. **Preview & Validate** — see valid/invalid row counts, error details with row numbers, sample post previews
5. **Complete** — bulk insert all valid posts as drafts

**Smart parsing** handles:
- Quoted fields, escaped characters, multi-line values
- US (`MM/DD/YYYY`), European (`DD.MM.YYYY`), and ISO (`YYYY-MM-DD`) date formats
- Platform aliases (`ig`, `insta`, `x`, `fb`, `li`, `tt`, `yt`, `pin`)
- Content type aliases (`reel`/`video`, `static`/`image`/`photo`, `carousel`/`gallery`, `text`/`tweet`)
- Downloadable sample CSV template

### 2.5 Publishing Queue
- Dashboard showing all posts with draft, validated, needs-edits, blocked, scheduled, published, and failed states
- **Filter** by channel and status
- **Bulk actions**: select multiple posts → validate all or schedule all in one click
- Inline governance issue display with color-coded severity and unlock path suggestions
- Real-time draft/validated/blocked summary counts

### 2.6 Calendar View
- Full month calendar grid with day-by-day post visibility
- Color-coded by status (gray = draft, green = validated, amber = needs edits, red = blocked, blue = scheduled, purple = published)
- Filter by channel
- Click any post to jump directly into the Composer
- Up to 3 posts shown per day cell, with "+N more" overflow
- Today highlighting

### 2.7 Asset Management
- Central media gallery across all channels
- Upload images and videos with drag-and-drop
- Filter by channel, role, or filename search
- Per-asset role tagging: Proof, Decorative, Educational, UI
- Quality review workflow: Mark assets as OK, Warning, or Blocked
- File size and type display

### 2.8 Publishing Pipeline (Dry Run)
- Fetches all scheduled posts and simulates per-platform publishing
- Currently operates in **dry-run mode** — no live platform delivery yet
- Logs all publish attempts for audit trail
- Designed for future platform connector integration (API keys per platform)

### 2.9 Audit Logging
- Every governance validation, CSV import, and publish attempt is logged
- Full JSON payloads stored per event
- Event types: `validation`, `csv_import`, `dry_run_publish`, `publish`
- Filterable by channel and post

---

## 3. The 9 Product Channels (Seeded)

| # | Channel Name | Code | Governance | Platforms | Max Posts/Week |
|---|---|---|---|---|---|
| 1 | Infinite Authority | `ia` | STRICT | Instagram, LinkedIn, Twitter | 7 |
| 2 | ContextEmbed | `contextembed` | STRICT | LinkedIn, Twitter | 5 |
| 3 | SiteFixEngine | `sitefixengine` | STRICT | LinkedIn, Twitter, Instagram | 7 |
| 4 | Asset Liberator | `assetliberator` | STRICT | Instagram, Facebook, Twitter | 4 |
| 5 | QuoteKits | `quotekits` | STANDARD | Instagram, Pinterest, Twitter | 10 |
| 6 | TogNinja | `togninja` | STANDARD | Instagram, Twitter, YouTube | 7 |
| 7 | ChaosCut | `chaoscut` | EXPERIMENTAL | Instagram, TikTok, YouTube | 14 |
| 8 | BatchLight | `batchlight` | EXPERIMENTAL | Instagram, Twitter, YouTube | 14 |
| 9 | ShootCleaner | `shootcleaner` | EXPERIMENTAL | Instagram, Twitter, YouTube | 14 |

---

## 4. Key Screens for Homepage Design Reference

| Screen | Purpose | Hero-Worthy? |
|---|---|---|
| **Dashboard** | System overview, KPI stats, quick actions, setup status | ✅ Landing context |
| **Composer** | Full post editing + live social preview + governance panel | ✅ Product hero |
| **Queue** | Content pipeline with bulk actions and governance status | ✅ Workflow showcase |
| **Calendar** | Month-view content planning with color-coded statuses | ✅ Planning visual |
| **CSV Import** | 5-step wizard with smart column mapping | ✅ Import UX |
| **Channels** | Channel grid with governance profiles and platform badges | Good for features section |
| **Assets** | Media gallery with quality review workflow | Good for features section |
| **Settings** | System info, governance reference, database status | Reference only |

---

## 5. Feature Summary for Homepage Copy

### Headline Features
1. **Governed Publishing** — Three-tier governance engine (Strict / Standard / Experimental) that scores and classifies every post before it goes live
2. **9-Channel Content Hub** — Manage content for 9 products from one dashboard, each with its own rules
3. **Live Social Previews** — See pixel-accurate previews for 7 platforms as you write
4. **Smart CSV Import** — Bulk-import 120-day content calendars with intelligent column mapping and format detection
5. **Brand Safety Guardrails** — Automatic detection of hype language, competitor claims, spam, and scam patterns
6. **Actionable Unlock Paths** — When content is blocked, get specific instructions on exactly what to fix

### Supporting Features
7. **Content Composer** — Rich editor with caption, CTA, hashtags, media upload, and platform targeting
8. **Publishing Queue** — Filter, sort, bulk-validate, and schedule posts across all channels
9. **Calendar View** — Month-view planning grid with status color-coding and channel filtering
10. **Asset Management** — Upload, tag, and quality-review media assets per channel
11. **Audit Trail** — Every validation, import, and publish event is logged with full details
12. **Dual Storage** — Works with Supabase (PostgreSQL) or browser localStorage for zero-config demos
13. **Cadence Enforcement** — Per-channel rules for max posts/week and minimum spacing
14. **Dry-Run Publishing** — Simulate full publish pipeline before going live

---

## 6. Platform Support Matrix

| Platform | Preview | Publishing Target |
|---|---|---|
| Instagram | ✅ Feed post preview | ✅ |
| Twitter / X | ✅ Tweet card preview | ✅ |
| LinkedIn | ✅ Professional post preview | ✅ |
| Facebook | ✅ Post card preview | ✅ |
| TikTok | ✅ Vertical video preview | ✅ |
| YouTube | ✅ Thumbnail preview | ✅ |
| Pinterest | ✅ Pin card preview | ✅ |

---

## 7. Content Lifecycle

```
CSV Import / Manual Create
        ↓
    📝 DRAFT
        ↓
  Governance Validation
        ↓
   ┌────┼────────┐
   ↓    ↓        ↓
  ✅   ⚠️       ❌
Allowed  Edits  Blocked
   ↓    ↓        ↓
   ↓  Fix Post  Fix Post
   ↓    ↓        ↓
   └────┘────────┘
        ↓
   📅 SCHEDULED
        ↓
  Publish Pipeline
        ↓
   ┌────┴────┐
   ↓         ↓
  ✅        ❌
Published  Failed
```

---

## 8. Governance Rules Quick Reference

### Blocked Content Patterns (STRICT + STANDARD)
- **Spam**: "free money", "click here", "buy now", "DM me", "$$$", excessive emoji spam (🔥🔥🔥, 💰💰💰, 🚀🚀🚀)
- **Scams**: crypto investment schemes, "passive income", "financial freedom", "pyramid", "MLM"

### Additional Blocks (STRICT only)
- **Hype language**: "guaranteed", "100%", "never fail", "best in the world", "#1", "revolutionary", "game-changer", "miracle", "magic", "instant results", "get rich", "limited time only", "act now", "secret"
- **Competitor comparisons**: "better than", "superior to", "beats", "unlike [Name]", "competitor"
- **Missing CTA** — must include a call-to-action
- **Missing hashtags** — must include hashtags
- **Missing images** — static and carousel posts require image assets

---

## 9. Technical Notes for Design Team

- **Dark theme UI** — zinc/gray palette with emerald (#10b981) accent color
- **Font**: Inter (Google Fonts)
- **Icon library**: Lucide React
- **Responsive layout**: Fixed 256px sidebar + fluid main content
- **Internal use only** — no auth required, no public-facing login
- **Version**: 0.1.0 (pre-release)
- **Publishing mode**: Dry Run only in v1

---

## 10. Suggested Homepage Sections

1. **Hero** — "Governed content publishing for every channel" + Composer screenshot
2. **Problem / Solution** — "9 products. 7 platforms. One system that keeps it all brand-safe."
3. **Governance Engine** — Visual of the three tiers with example pass/fail
4. **Social Preview** — Side-by-side platform previews (Instagram, Twitter, LinkedIn, TikTok)
5. **Import & Plan** — CSV wizard + Calendar view screenshots
6. **Channel Grid** — Show all 9 channels with their governance badges
7. **Content Lifecycle** — Flow diagram from draft → validation → publish
8. **Feature Grid** — 12–14 features with icons and short descriptions

---

*Document generated from codebase analysis — Pulse.Online v0.1.0*
