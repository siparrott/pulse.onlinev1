# Engagement Ingestion Cron Setup

Phase 6 uses an external cron / scheduler to trigger `POST /api/jobs/ingest-engagement-due`.
The endpoint is protected with the same `JOB_SECRET` used by Phase 5's publishing runner.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `JOB_SECRET` | Shared secret (same as Phase 5 publishing cron) |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex key for token decryption (same as Phase 5) |

No new env vars are required beyond what Phase 5 already uses.

---

## Calling the Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/jobs/ingest-engagement-due \
  -H "x-job-secret: $JOB_SECRET"
```

### What it does

1. Finds all published `PostDelivery` rows that have a `platform_post_id`.
2. Determines which are "due" for ingestion:
   - **First 48h after publish**: ingest every **2 hours**
   - **After 48h**: ingest every **24 hours**
3. For each due delivery (up to **50 per run**):
   - Calls the platform's `MetricsFetcher` adapter
   - Stores an `EngagementSnapshot` row
   - Updates/creates an `EngagementRollup` with latest totals + 24h deltas
   - Detects spikes (>50% view increase) and milestones (100/500/1K likes etc.)
   - On error: stores `ok=false` snapshot, does not block other deliveries
4. Logs the run to `job_run_logs` with `type='ingest-engagement'`.

---

## Recommended Schedule

| Hosting | Schedule | Notes |
|---|---|---|
| **Vercel Cron** | `0 * * * *` (hourly) | Due logic throttles per post automatically |
| **GitHub Actions** | `0 */2 * * *` (every 2h) | Lower frequency OK; due logic handles spacing |
| **External pinger** | Every 1–6 hours | Set to match your freshness needs |

### Vercel Cron Example

```json
{
  "crons": [
    {
      "path": "/api/jobs/publish-due",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/jobs/ingest-engagement-due",
      "schedule": "0 * * * *"
    }
  ]
}
```

### GitHub Actions Example

```yaml
# .github/workflows/ingest-engagement-cron.yml
name: Ingest Engagement Metrics
on:
  schedule:
    - cron: '0 */2 * * *'
  workflow_dispatch: {}

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ingestion
        run: |
          curl -s -X POST "${{ secrets.APP_URL }}/api/jobs/ingest-engagement-due" \
            -H "x-job-secret: ${{ secrets.JOB_SECRET }}"
```

---

## Local Development

```bash
# Run a single ingestion pass locally
curl -X POST http://localhost:3000/api/jobs/ingest-engagement-due \
  -H "x-job-secret: your-local-secret"
```

All platforms use **dry-run fetchers** by default, returning plausible simulated
metrics that grow over time. No API keys needed for local testing.

---

## Monitoring

- **Job logs**: `SELECT * FROM job_run_logs WHERE type = 'ingest-engagement' ORDER BY started_at DESC LIMIT 10;`
- **Snapshot health**: `SELECT ok, COUNT(*) FROM engagement_snapshots GROUP BY ok;`
- **In-app**: Visit `/analytics` for the overview dashboard or `/digests` for daily summaries.

---

## Dry-Run Fetchers

All 7 platforms (instagram, twitter, linkedin, facebook, tiktok, youtube, pinterest)
ship with dry-run fetchers that return deterministic, gradually increasing metrics.
This makes the entire ingestion pipeline demo-ready without real API credentials.

To register a real fetcher, implement the `MetricsFetcher` interface and register it:

```ts
import { registerMetricsFetcher } from '@/lib/platforms/metrics';
import { myRealTwitterFetcher } from './twitter-fetcher';
registerMetricsFetcher(myRealTwitterFetcher);
```
