# Automation Cron Setup

Phase 7 adds two automation endpoints that should be called on a recurring schedule.

## Endpoints

### 1. Evaluate Rules
```
POST /api/jobs/automation-evaluate-due
Header: X-JOB-SECRET: <your-job-secret>
```
- Loads enabled automation rules (currently Facebook only)
- Evaluates conditions against published deliveries with engagement data
- Creates ActionLog entries (+ Approval records if `requires_approval = true`)
- **Recommended frequency:** every 1–6 hours
- The condition DSL includes time-window logic, so calling more often is safe

### 2. Execute Approved Actions
```
POST /api/jobs/automation-execute-due
Header: X-JOB-SECRET: <your-job-secret>
```
- Picks queued ActionLog entries that are due
- Checks approval status (skips if pending/rejected)
- Executes actions: creates PostSchedule + PostDelivery for reposts, stores notifications, etc.
- Handles retries with backoff (5m, 30m, 2h, 12h, max 5 attempts)
- **Recommended frequency:** every 5–15 minutes

## Kill Switch

Set `AUTOMATION_DISABLED=true` in your environment to block all action execution globally.
The evaluate endpoint will still run (and log actions as "blocked"), but no actions will be executed.

## Vercel Cron Example

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/jobs/automation-evaluate-due",
      "schedule": "0 */3 * * *"
    },
    {
      "path": "/api/jobs/automation-execute-due",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Note: Vercel cron uses GET by default. You may need a wrapper or use the `X-JOB-SECRET` header via a middleware.

## GitHub Actions Example

```yaml
name: Automation Runner
on:
  schedule:
    - cron: '0 */3 * * *'   # evaluate every 3h
    - cron: '*/10 * * * *'  # execute every 10m

jobs:
  automation:
    runs-on: ubuntu-latest
    steps:
      - name: Evaluate rules
        if: github.event.schedule == '0 */3 * * *'
        run: |
          curl -s -X POST "${{ secrets.APP_URL }}/api/jobs/automation-evaluate-due" \
            -H "X-JOB-SECRET: ${{ secrets.JOB_SECRET }}"

      - name: Execute actions
        if: github.event.schedule == '*/10 * * * *'
        run: |
          curl -s -X POST "${{ secrets.APP_URL }}/api/jobs/automation-execute-due" \
            -H "X-JOB-SECRET: ${{ secrets.JOB_SECRET }}"
```

## Local Development

```bash
# Evaluate rules
curl -X POST http://localhost:3000/api/jobs/automation-evaluate-due \
  -H "X-JOB-SECRET: your-secret-here"

# Execute approved actions
curl -X POST http://localhost:3000/api/jobs/automation-execute-due \
  -H "X-JOB-SECRET: your-secret-here"
```

## Monitoring Queries

```sql
-- Recent automation runs
SELECT rule_id, ok, summary, started_at
FROM automation_runs
ORDER BY started_at DESC
LIMIT 10;

-- Pending approvals
SELECT a.id, a.status, al.action_type, al.reason
FROM automation_approvals a
JOIN automation_action_logs al ON al.id = a.action_log_id
WHERE a.status = 'pending';

-- Blocked actions (kill switch or constraints)
SELECT action_type, reason, created_at
FROM automation_action_logs
WHERE status = 'blocked'
ORDER BY created_at DESC
LIMIT 20;

-- Action success rate
SELECT status, COUNT(*) as cnt
FROM automation_action_logs
GROUP BY status;
```

## Safety Rails Summary

| Rail | Description |
|------|-------------|
| `maxActionsPerDay` | Caps total actions per rule per day |
| `cooldownHoursPerPost` | Minimum hours between actions for same delivery |
| `maxRepostsPerOriginal` | Max reposts created for one original delivery |
| `quietHours` | No scheduling during these hours (shifts to next allowed) |
| `AUTOMATION_DISABLED` | Global env kill switch |
| `requires_approval` | Actions need manual approval before execution |
| `is_enabled` | Per-rule toggle |
