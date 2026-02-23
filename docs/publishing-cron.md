# Publishing Cron Setup

Phase 5 uses an external cron / scheduler to trigger `POST /api/jobs/publish-due`.
The endpoint is protected with a shared secret — no tokens or user sessions.

---

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `JOB_SECRET` | Shared secret for the `/api/jobs/publish-due` endpoint | `my-super-secret-value` |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM encryption of OAuth tokens at rest | `aabbccdd…` (64 hex chars) |
| `WEBHOOK_PUBLISHER_URL` | *(optional)* URL the webhook publisher POSTs to | `https://hooks.example.com/publish` |

Set these in your Vercel project → Settings → Environment Variables, or in `.env.local` for local dev.

---

## Calling the Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/jobs/publish-due \
  -H "x-job-secret: $JOB_SECRET"
```

The endpoint:
1. Finds up to **20** schedules whose `scheduled_for ≤ NOW` and `status = 'scheduled'`.
2. Atomically claims them (`status → publishing`).
3. Publishes each delivery through the registered publisher (dry-run by default).
4. Updates delivery & schedule statuses.
5. Logs the run to `job_run_logs`.

Retries: failed deliveries are retried with back-off up to **5 attempts** (5 min → 30 min → 2 hr → 12 hr).

---

## Scheduling Options

### 1. Vercel Cron (recommended for Vercel hosting)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/publish-due",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

> **Note:** Vercel cron doesn't support custom headers natively.
> You can instead check `req.headers.get('x-vercel-cron-signature')` or
> set the `JOB_SECRET` as a query param for Vercel cron:
> `"path": "/api/jobs/publish-due?secret=YOUR_SECRET"` and update the
> route to accept `?secret=` as an alternative.

### 2. GitHub Actions

```yaml
# .github/workflows/publish-cron.yml
name: Publish Due Posts
on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch: {}

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger publish
        run: |
          curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${{ secrets.APP_URL }}/api/jobs/publish-due" \
            -H "x-job-secret: ${{ secrets.JOB_SECRET }}"
```

### 3. External Pinger (cron-job.org, Render Cron, EasyCron)

Point the service at:

```
POST https://your-app.vercel.app/api/jobs/publish-due
Header: x-job-secret: <your-secret>
```

Schedule: every 5 minutes (or more frequently if needed).

---

## Dry-Run vs Real Publishing

All platforms default to **dry-run** publishers — they simulate a 300-800 ms delay and return a fake `platform_post_id`. This lets you test the full pipeline without connected accounts.

To enable real publishing, register a real publisher in `src/lib/platforms/publishers/index.ts`:

```ts
import { registerPublisher } from './index';
import { myRealTwitterPublisher } from './twitter';
registerPublisher(myRealTwitterPublisher);
```

Each publisher implements the `Publisher` interface from `src/lib/platforms/publishers/types.ts`.

---

## Monitoring

Check `job_run_logs` in Supabase for run history:

```sql
SELECT * FROM job_run_logs ORDER BY started_at DESC LIMIT 20;
```

Or view the **Publishing** page in the app for a UI-based overview of schedules and delivery statuses.
