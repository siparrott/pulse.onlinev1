# Pulse.Online

**Internal Governed Publishing System for Multi-Channel Content Management**

Pulse is an internal-only publishing system designed to plan, validate, schedule, and publish 120-day content calendars across multiple product channels with strict governance controls.

---

## 🎯 Core Concept: Channels

Each **Channel** represents a product brand with its own:
- **Voice & Tone** guidelines
- **Governance Profile** (strict/standard/experimental)
- **Platform Allowlist** (Instagram, Twitter, LinkedIn, etc.)
- **Cadence Rules** (posting frequency limits)
- **Asset Requirements** (image requirements per content type)

### Initial Product Channels

| Channel | Code | Governance | Platforms |
|---------|------|------------|-----------|
| Infinite Authority | `ia` | Strict | Instagram, LinkedIn, Twitter |
| QuoteKits | `quotekits` | Standard | Instagram, Pinterest, Twitter |
| ContextEmbed | `contextembed` | Strict | LinkedIn, Twitter |
| ShootCleaner | `shootcleaner` | Experimental | Instagram, Twitter, YouTube |
| BatchLight | `batchlight` | Experimental | Instagram, Twitter, YouTube |
| ChaosCut | `chaoscut` | Experimental | Instagram, TikTok, YouTube |
| TogNinja | `togninja` | Standard | Instagram, Twitter, YouTube |
| SiteFixEngine | `sitefixengine` | Strict | LinkedIn, Twitter, Instagram |
| Asset Liberator | `assetliberator` | Strict | Instagram, Facebook, Twitter |

---

## 🛡️ Governance Philosophy

**"No brand-depreciating or risky posts allowed."**

Every post is validated against the channel's governance profile before scheduling:

### STRICT Profile
- ❌ No hype language ("guaranteed", "revolutionary", "best in the world")
- ❌ No unproven comparisons to competitors
- ✅ Mandatory CTA (Call to Action)
- ✅ Mandatory hashtags
- ✅ Image required for static/carousel posts
- Used by: IA, ContextEmbed, SiteFixEngine, Asset Liberator

### STANDARD Profile
- ⚠️ Softer language allowed
- ⚠️ Benefits statements OK, but no guarantees
- 📷 Image recommended but not required
- Used by: QuoteKits, TogNinja

### EXPERIMENTAL Profile
- ✨ Creative language allowed
- ❌ Still blocks spam and scam patterns
- 📷 Relaxed asset requirements
- Used by: ChaosCut, BatchLight, ShootCleaner

### Why Posts Get Blocked

1. **Hype Language** - Words like "guaranteed", "100%", "revolutionary"
2. **Unproven Comparisons** - Claims about being "better than" competitors
3. **Missing Requirements** - No CTA, no hashtags, no required image
4. **Spam Patterns** - "Click here", "Buy now", excessive emojis
5. **Scam Patterns** - Crypto/MLM language, "passive income"

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+
- A Supabase project

### 2. Installation

```bash
npm install
```

### 3. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Copy the environment template:
```bash
cp .env.local.example .env.local
```

3. Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set Up Database

Run these SQL files in your Supabase SQL Editor:

1. **Schema** - `supabase/schema.sql`
2. **Seeds** - `supabase/seed.sql`

### 5. Create Storage Bucket

In Supabase Dashboard → Storage:
1. Create a bucket named `publisher-assets`
2. Set access to private (internal only)

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
pulse.online/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── channels/          # Channel management
│   │   ├── imports/           # CSV import wizard
│   │   ├── queue/             # Post review queue
│   │   ├── calendar/          # Calendar view
│   │   ├── composer/[postId]/ # Post editor
│   │   ├── assets/            # Asset library
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── lib/
│   │   ├── governance/       # Validation engine
│   │   ├── csv/              # CSV parser
│   │   ├── schemas/          # Zod schemas
│   │   ├── supabase/         # Database client
│   │   └── types/            # TypeScript types
│   └── tests/                # Vitest tests
├── supabase/
│   ├── schema.sql            # Database schema
│   └── seed.sql              # Initial channel data
└── vitest.config.ts
```

---

## 📥 Importing a 120-Day Calendar

### CSV Format

| Column | Required | Example |
|--------|----------|---------|
| Date | ✅ | 2026-02-10 |
| Platform | ✅ | instagram, twitter |
| Content Type | ✅ | static, carousel, reel, text |
| Caption | ✅ | Your post content... |
| Theme | ❌ | Product Launch |
| CTA | ❌ | Learn more at example.com |
| Hashtags | ❌ | #product #launch |

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 📦 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Vitest tests
```

---

## 🔐 Security

This is an **internal-only** system - no authentication in v1.

---

## 📄 License

Internal use only.
