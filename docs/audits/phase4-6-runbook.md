# Phases 4–6 — Operations Runbook

**Generated**: 2025-07-21  
**Scope**: Phase 4 (Variant Builder), Phase 5 (Posting Pipeline), Phase 6 (Engagement Analytics)

---

## 1. Environment Variables

### Required for All Phases

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qpnockgmkftnydxtwxjp.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ…` | Supabase anonymous key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` | Supabase service role key (server-side API routes) |

### Phase 4 Only

| Variable | Required | Purpose |
|----------|----------|---------|
| _(none)_ | — | Phase 4 relies only on Supabase Storage (`publisher-assets` bucket) |

### Phase 5

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `JOB_SECRET` | **Yes** | `pulse-cron-secret-2025` | Auth header for publish runner cron |
| `TOKEN_ENCRYPTION_KEY` | **Yes** (prod) | 64-char hex string | AES-256-GCM key for token encryption |
| `WEBHOOK_PUBLISHER_URL` | No | `https://hooks.example.com/publish` | Endpoint for webhook publisher |

### Phase 6

| Variable | Required | Purpose |
|----------|----------|---------|
| `JOB_SECRET` | **Yes** | Auth header for engagement ingest cron (shared with Phase 5) |

### Generating `TOKEN_ENCRYPTION_KEY`

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

---

## 2. Database Migrations

Migrations must be run **in order**:

```
supabase/migrations/003_post_variants.sql      ← Phase 4
supabase/migrations/004_posting_pipeline.sql    ← Phase 5
supabase/migrations/005_engagement_ingestion.sql ← Phase 6
```

### Running Migrations

```bash
# Local Supabase
npx supabase db reset

# Remote — via Supabase CLI
npx supabase db push

# Or manually via SQL editor in Supabase dashboard
```

### Required Supabase Storage Bucket

Phase 4 requires a `publisher-assets` storage bucket:

```sql
-- In Supabase SQL editor:
INSERT INTO storage.buckets (id, name, public)
VALUES ('publisher-assets', 'publisher-assets', false)
ON CONFLICT DO NOTHING;
```

---

## 3. Cron Job Configuration

### Phase 5: Publish Runner

| Setting | Value |
|---------|-------|
| Endpoint | `POST /api/jobs/publish-due` |
| Auth header | `x-job-secret: {JOB_SECRET}` |
| Frequency | Every 1–5 minutes |
| Timeout | 60 seconds (batch of 20 schedules max) |
| Idempotent | Yes — atomic claim prevents double-processing |

**Vercel Cron example** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/jobs/publish-due",
    "schedule": "*/2 * * * *"
  }]
}
```

**External cron (curl)**:
```bash
curl -X POST https://your-app.vercel.app/api/jobs/publish-due \
  -H "x-job-secret: $JOB_SECRET" \
  -H "Content-Type: application/json"
```

### Phase 6: Engagement Ingest Runner

| Setting | Value |
|---------|-------|
| Endpoint | `POST /api/jobs/ingest-engagement-due` |
| Auth header | `x-job-secret: {JOB_SECRET}` |
| Frequency | Every 15–60 minutes |
| Timeout | 120 seconds (may process many deliveries) |
| Idempotent | Yes — `last_captured_at` prevents re-ingesting too early |

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/jobs/ingest-engagement-due",
    "schedule": "*/15 * * * *"
  }]
}
```

---

## 4. Common Failures & Troubleshooting

### Phase 4

| Symptom | Cause | Fix |
|---------|-------|-----|
| "DB insert failed" on build-variants | Missing UNIQUE constraint on `post_variants` | Apply FIX-001: add `UNIQUE(post_id, platform_id)` |
| "Invalid storage path" on sign-url | Path validation rejects `posts/…` | Apply FIX-002: allow `posts/` prefix |
| Variants build but `updatePost()` doesn't save strategy | `CLIENT_ONLY_FIELDS` blocks write | Apply FIX-003: remove Phase 4 fields from list |
| "Supabase not configured" 503 | Missing `SUPABASE_SERVICE_ROLE_KEY` | Set env var in `.env.local` or hosting platform |
| Sharp fails with "Input file is missing" | Source image not uploaded to storage | Upload source first via `/api/upload-source` |
| ZIP export empty | No variants built for post | Build variants before exporting |

### Phase 5

| Symptom | Cause | Fix |
|---------|-------|-----|
| Publish runner returns 401 | Missing or wrong `JOB_SECRET` | Set `JOB_SECRET` env var; match `x-job-secret` header |
| "Connection is expired" not caught | Stale local object after `rotateTokensIfNeeded()` | Apply FIX-005: re-fetch connection |
| Schedule stuck in "scheduled" after all deliveries fail | `allFinalFailed` uses stale array | Apply FIX-004: use `allDeliveries` |
| All publishers return dry-run results | No real publishers registered | Expected — register webhook or implement real SDKs |
| "Connection not found" during publish | Connection deleted after scheduling | Add `ON DELETE SET NULL` (FIX-009) |
| Token decryption fails | Wrong `TOKEN_ENCRYPTION_KEY` or key not set | Verify env var is correct 64-char hex |
| Publish hangs indefinitely | Publisher has no timeout | Apply FIX-010: add 30s AbortController |

### Phase 6

| Symptom | Cause | Fix |
|---------|-------|-----|
| `hasRealMetricsFetcher()` returns true for all | Broken check logic | Apply FIX-006 |
| Overview totals don't change with days filter | `days` only filters time-series | Apply FIX-007 |
| Time-series chart shows inflated numbers | Cumulative snapshots summed | Apply FIX-012 |
| Duplicate rollup rows | Non-atomic SELECT+INSERT | Apply FIX-011 |
| Ingest runner returns 401 | Missing `JOB_SECRET` | Same as Phase 5 — shares the env var |
| No engagement data after publish | Deliveries don't have `platform_post_id` | Ensure publish runner saved the platform post ID |
| Analytics page shows no data | API errors silently swallowed | Check browser dev console; apply FIX-021 |

---

## 5. Production Verification Checklist

### Pre-Deploy

- [ ] All migrations applied in order (003 → 004 → 005)
- [ ] `publisher-assets` storage bucket exists
- [ ] `JOB_SECRET` env var set
- [ ] `TOKEN_ENCRYPTION_KEY` env var set (64-char hex)
- [ ] Cron jobs configured for both runners
- [ ] Build passes (`npm run build` → 0 errors)
- [ ] TypeScript typecheck passes (`npx tsc --noEmit`)

### Post-Deploy Smoke Test

Run in order:

```bash
BASE=https://your-app.vercel.app
SECRET=your-job-secret

# 1. Health check
curl "$BASE/api/channels"

# 2. List connections
curl "$BASE/api/connections"

# 3. Trigger publish runner (should return processed: 0 if no due schedules)
curl -X POST "$BASE/api/jobs/publish-due" \
  -H "x-job-secret: $SECRET"

# 4. Trigger ingest runner
curl -X POST "$BASE/api/jobs/ingest-engagement-due" \
  -H "x-job-secret: $SECRET"

# 5. Analytics overview
curl "$BASE/api/analytics/overview?days=7"

# 6. Schedules list
curl "$BASE/api/schedules"
```

### Monitoring Queries

```sql
-- Recent publish job runs
SELECT * FROM job_run_logs WHERE type = 'publish' ORDER BY started_at DESC LIMIT 10;

-- Recent ingest job runs
SELECT * FROM job_run_logs WHERE type = 'ingest' ORDER BY started_at DESC LIMIT 10;

-- Failed deliveries with retry info
SELECT id, platform_id, status, attempts, last_error, next_retry_at
FROM post_deliveries WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 20;

-- Engagement rollup health
SELECT COUNT(*), MAX(last_captured_at) as latest_capture FROM engagement_rollups;

-- Error snapshots
SELECT * FROM engagement_snapshots WHERE ok = false ORDER BY captured_at DESC LIMIT 10;

-- Spike events
SELECT * FROM user_engagement_events WHERE event_type = 'spike' ORDER BY created_at DESC LIMIT 10;
```

---

## 6. Dry-Run Mode

All three phases support dry-run operation without real platform connections:

| Component | Dry-Run Behavior |
|-----------|-----------------|
| **Variant Builder** (Phase 4) | Fully functional — Sharp runs locally, images saved to Supabase Storage |
| **Publishers** (Phase 5) | All 7 platforms auto-register as dry-run publishers; sleep 300–800ms and return fake post IDs |
| **Metrics Fetchers** (Phase 6) | Deterministic fake metrics that grow over time; `dryRun: true` in raw metadata |
| **Encryption** | If `TOKEN_ENCRYPTION_KEY` unset, tokens stored as plaintext (dev-only) |

To force dry-run in production, simply don't register real publishers or metrics fetchers — the system auto-creates dry-run instances.

---

## 7. Rollback Procedures

### Phase 6 Rollback
```sql
DROP TABLE IF EXISTS user_engagement_events CASCADE;
DROP TABLE IF EXISTS engagement_snapshots CASCADE;
DROP TABLE IF EXISTS engagement_rollups CASCADE;
```
Then remove Phase 6 API routes and analytics pages.

### Phase 5 Rollback
```sql
DROP TABLE IF EXISTS job_run_logs CASCADE;
DROP TABLE IF EXISTS post_deliveries CASCADE;
DROP TABLE IF EXISTS post_schedules CASCADE;
DROP TABLE IF EXISTS user_platform_connections CASCADE;
```
Then remove Phase 5 API routes, publishing page, and publisher/token files.

### Phase 4 Rollback
```sql
DROP TABLE IF EXISTS variant_build_logs CASCADE;
DROP TABLE IF EXISTS post_variants CASCADE;
ALTER TABLE publisher_posts
  DROP COLUMN IF EXISTS source_image,
  DROP COLUMN IF EXISTS selected_platforms,
  DROP COLUMN IF EXISTS variant_strategy;
```
Then remove Phase 4 API routes, image builder, and storage service files.
