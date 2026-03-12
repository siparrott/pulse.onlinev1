# Phases 4–6 — Fix List

**Generated**: 2025-07-21  
**Commit baseline**: `a9959d3`

Each fix is numbered, severity-rated, and includes the exact file(s), change description, and acceptance check.

---

## HIGH Severity (Must Fix)

### FIX-001: Add UNIQUE constraint on `post_variants(post_id, platform_id)`

- **Phase**: 4
- **File**: `supabase/migrations/003_post_variants.sql`
- **Problem**: `saveVariant.ts` calls `.upsert({ onConflict: 'post_id,platform_id' })` but there is no `UNIQUE(post_id, platform_id)` constraint on the table. Supabase/PostgreSQL will reject the upsert at runtime.
- **Change**: Add `ALTER TABLE post_variants ADD CONSTRAINT uq_post_variants_post_platform UNIQUE (post_id, platform_id);` to the migration (or a new migration file).
- **Acceptance**: Re-building variants for the same post+platform succeeds without error; duplicate rows are never created.

---

### FIX-002: Fix sign-url path validation to accept variant paths

- **Phase**: 4
- **File**: `src/app/(app)/api/sign-url/route.ts`
- **Problem**: Path validation checks `storagePath.startsWith('ai/')` — Phase 4 variants use `posts/{postId}/variants/…` paths, which are rejected with 400.
- **Change**: Replace `!storagePath.startsWith('ai/')` with `!storagePath.startsWith('ai/') && !storagePath.startsWith('posts/')`.
- **Also**: Replace `import { supabase }` with `import { createServerClient }` for consistency with Phase 4+ patterns.
- **Acceptance**: POST `/api/sign-url` with `{ storagePath: "posts/abc/variants/instagram_feed/variant.jpg" }` returns a signed URL.

---

### FIX-003: Remove Phase 4 fields from CLIENT_ONLY_FIELDS

- **Phase**: 4
- **File**: `src/lib/storage/posts.ts` (line ~322)
- **Problem**: `source_image`, `selected_platforms`, `variant_strategy` are in `CLIENT_ONLY_FIELDS` and are filtered out before Supabase writes. The DB columns exist (003 migration), so they should be written.
- **Change**: Remove `'source_image', 'selected_platforms', 'variant_strategy'` from the `CLIENT_ONLY_FIELDS` array.
- **Acceptance**: Calling `updatePost(id, { variant_strategy: 'platform_safe', selected_platforms: [...] })` persists these fields to Supabase.

---

### FIX-004: Fix `allFinalFailed` using stale deliveries array

- **Phase**: 5
- **File**: `src/app/(app)/api/jobs/publish-due/route.ts` (~line 217)
- **Problem**: `allFinalFailed` references the original `deliveries` array (fetched before processing) and uses `.find()` to get the first failed delivery's attempts for ALL statuses. Should use `allDeliveries` and check each delivery's own attempts.
- **Change**:
  ```typescript
  // Before (broken):
  const allFinalFailed = statuses.every((s: string) => s === 'failed' && 
    (deliveries.find((d: PostDelivery) => d.status === 'failed')?.attempts ?? 0) >= MAX_ATTEMPTS
  );
  
  // After (fixed):
  const allFinalFailed = (allDeliveries ?? []).every(
    (d: { status: string; attempts: number }) =>
      d.status === 'failed' && d.attempts >= MAX_ATTEMPTS
  );
  ```
- **Acceptance**: When all deliveries exhaust retries, schedule status transitions to `'failed'`.

---

### FIX-005: Re-fetch connection after `rotateTokensIfNeeded()`

- **Phase**: 5
- **File**: `src/app/(app)/api/jobs/publish-due/route.ts` (~line 127)
- **Problem**: `rotateTokensIfNeeded(connection)` mutates the DB but not the local `connection` object. The subsequent `connection.status` check reads stale data — an expired token won't be caught.
- **Change**: After calling `rotateTokensIfNeeded(connection)`, re-fetch the connection from DB:
  ```typescript
  await rotateTokensIfNeeded(connection);
  // Re-read status from DB
  const { data: refreshedConn } = await supabase
    .from('user_platform_connections')
    .select('status')
    .eq('id', connection.id)
    .single();
  if (refreshedConn) connection.status = refreshedConn.status;
  ```
- **Acceptance**: When a token is expired, the delivery fails with an error message mentioning the expired status, not a downstream API error.

---

### FIX-006: Fix `hasRealMetricsFetcher()` always returning true

- **Phase**: 6
- **File**: `src/lib/platforms/metrics/index.ts` (~line 29)
- **Problem**: Checks `!f.platformId.startsWith('dry-run-')`, but dry-run fetchers have platformId = `'instagram'`, `'twitter'`, etc. The check never matches.
- **Change**: Add a `dryRun: boolean` flag to the `MetricsFetcher` interface and set it in `createDryRunMetricsFetcher()`. Then check `!f.dryRun` instead of the string prefix.
  - Alternative (minimal): track which fetchers were registered via `registerMetricsFetcher()` separately from auto-created dry-run entries.
- **Acceptance**: `hasRealMetricsFetcher('instagram')` returns `false` when only the dry-run fetcher is registered.

---

### FIX-007: Fix overview API ignoring `days` filter for totals

- **Phase**: 6
- **File**: `src/app/(app)/api/analytics/overview/route.ts` (~line 29)
- **Problem**: The `days` query param only filters the time-series snapshots, not the rollup totals. Users see all-time totals regardless of time filter.
- **Change**: Apply a date filter (`.gte('last_captured_at', sinceDate)`) to the rollups query when `days` is specified.
- **Acceptance**: Selecting "7 days" shows totals only from the last 7 days.

---

### FIX-008: Remove or auth-gate legacy `/api/publish/run`

- **Phase**: 5
- **File**: `src/app/(app)/api/publish/run/route.ts`
- **Problem**: Legacy route with zero auth, uses old `supabase` singleton, bypasses the Phase 5 schedule/delivery pipeline. Dead code that's still publicly accessible.
- **Change**: Add `JOB_SECRET` auth gate (same pattern as `publish-due`) or delete the file entirely.
- **Acceptance**: Unauthenticated POST to `/api/publish/run` returns 401.

---

## MEDIUM Severity (Should Fix)

### FIX-009: Add `ON DELETE SET NULL` on `post_deliveries.connection_id` FK

- **Phase**: 5
- **File**: `supabase/migrations/004_posting_pipeline.sql`
- **Change**: `ALTER TABLE post_deliveries DROP CONSTRAINT IF EXISTS post_deliveries_connection_id_fkey; ALTER TABLE post_deliveries ADD CONSTRAINT post_deliveries_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES user_platform_connections(id) ON DELETE SET NULL;`
- **Acceptance**: Deleting a connection does not cause FK violations on existing deliveries.

---

### FIX-010: Add timeout on `publisher.publish()` calls

- **Phase**: 5
- **File**: `src/app/(app)/api/jobs/publish-due/route.ts`
- **Change**: Wrap `publisher.publish()` in an `AbortController` with a 30-second timeout:
  ```typescript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try { result = await publisher.publish(connection, payload); }
  finally { clearTimeout(timeout); }
  ```
- **Also**: Pass `signal` to `fetch()` in `webhook.ts`.
- **Acceptance**: A hung publisher call is aborted after 30 seconds.

---

### FIX-011: Make rollup upsert atomic in ingest runner

- **Phase**: 6
- **File**: `src/app/(app)/api/jobs/ingest-engagement-due/route.ts` (~line 163)
- **Change**: Replace SELECT + conditional INSERT/UPDATE with a single `.upsert()` call using `onConflict: 'post_delivery_id'`.
- **Prerequisite**: Confirm `engagement_rollups` has a unique constraint on `post_delivery_id`.
- **Acceptance**: Concurrent cron runs don't create duplicate rollups.

---

### FIX-012: Fix time-series double-counting in overview API

- **Phase**: 6
- **File**: `src/app/(app)/api/analytics/overview/route.ts` (~line 66)
- **Problem**: Summing cumulative snapshot values across multiple snapshots per delivery/day inflates totals.
- **Change**: Use `DISTINCT ON (post_delivery_id, date)` or take only the latest snapshot per delivery per day before summing.
- **Acceptance**: Time-series chart values match the actual latest metrics, not inflated sums.

---

### FIX-013: Hardcoded `imageMimeType` in publish runner

- **Phase**: 5
- **File**: `src/app/(app)/api/jobs/publish-due/route.ts` (~line 145)
- **Problem**: `imageMimeType` hardcoded to `'image/jpeg'` regardless of actual variant format.
- **Change**: Derive MIME type from the storage key extension or look up the variant's `format` field from `post_variants`.
- **Acceptance**: PNG and WebP variants are published with the correct MIME type.

---

### FIX-014: Race condition in schedule cancel vs. publish runner

- **Phase**: 5
- **File**: `src/app/(app)/api/schedules/[id]/cancel/route.ts`
- **Change**: Use optimistic concurrency — add `AND status IN ('draft', 'scheduled')` to the UPDATE statement and check `rowCount > 0`:
  ```typescript
  const { data, count } = await supabase
    .from('post_schedules')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .in('status', ['draft', 'scheduled'])
    .select();
  if (!data?.length) return NextResponse.json({ error: 'Schedule already in progress or completed' }, { status: 409 });
  ```
- **Acceptance**: Cancelling a schedule that was just claimed by the runner returns 409 instead of silently corrupting state.

---

### FIX-015: Wire `single_image` strategy for publishing

- **Phase**: 4→5 (cross-phase)
- **File**: `src/app/(app)/api/posts/[id]/schedule/route.ts` and `src/app/(app)/api/jobs/publish-due/route.ts`
- **Problem**: When `variant_strategy !== 'platform_safe'`, `variant_storage_key` is always null. Posts with a single source image won't have any image attached during publishing.
- **Change**: In schedule creation, if strategy is `single_image` and `post.source_image?.storageKey` exists, set `variant_storage_key` to the source image storage key for all deliveries.
- **Acceptance**: Publishing a `single_image` post attaches the source image to all platform deliveries.

---

### FIX-016: Upload-source path validation

- **Phase**: 4
- **File**: `src/app/(app)/api/upload-source/route.ts`
- **Change**: Validate that the upload path matches the expected pattern `posts/{uuid}/source/…` to prevent arbitrary file writes to storage.
- **Acceptance**: Uploading to a path like `../../secrets.json` is rejected.

---

### FIX-017: Add auth to analytics API routes

- **Phase**: 6
- **Files**: `src/app/(app)/api/analytics/overview/route.ts`, `posts/route.ts`, `post/[id]/route.ts`
- **Change**: Add a session or API key check. For internal tools, validate a cookie/session; for cron callers, use `JOB_SECRET`.
- **Acceptance**: Unauthenticated GET to `/api/analytics/overview` returns 401.

---

### FIX-018: Remove redundant status ternary in publish runner

- **Phase**: 5
- **File**: `src/app/(app)/api/jobs/publish-due/route.ts` (~line 202)
- **Change**: Replace `attempt >= MAX_ATTEMPTS ? 'failed' : 'failed'` with just `'failed'`.
- **Acceptance**: Code is cleaner, no logic change.

---

### FIX-019: Disconnect route should clear encrypted tokens

- **Phase**: 5
- **File**: `src/app/(app)/api/connections/[id]/disconnect/route.ts`
- **Change**: Also set `access_token_encrypted: null, refresh_token_encrypted: null` when revoking.
- **Acceptance**: Revoking a connection removes encrypted token data from the database.

---

## LOW Severity (Nice to Have)

### FIX-020: Add pagination to analytics API routes

- **Phase**: 6
- **Files**: `overview/route.ts`, `posts/route.ts`
- **Change**: Accept `page` and `pageSize` query params, apply `.range()`.
- **Acceptance**: Large datasets return paginated results.

---

### FIX-021: Add user feedback for analytics UI fetch errors

- **Phase**: 6
- **File**: `src/app/(app)/analytics/page.tsx`
- **Change**: Replace empty `catch {}` blocks with error state and user-facing alert.
- **Acceptance**: Network errors display a toast or inline error message.

---

### FIX-022: Parallelize Sharp variant building

- **Phase**: 4
- **File**: `src/lib/images/variantBuilder.ts`
- **Change**: Replace sequential `for…of` with `Promise.all()` for independent platform builds.
- **Acceptance**: Build time for 9 platforms is reduced (roughly proportional to CPU cores).

---

### FIX-023: Batch signed URL generation in `fetchVariants()`

- **Phase**: 4
- **File**: `src/lib/storage/saveVariant.ts`
- **Change**: Use `createSignedUrls()` (batch API) instead of per-variant `createSignedUrl()`.
- **Acceptance**: A single Supabase call replaces N calls.

---

### FIX-024: Add pagination to schedules listing

- **Phase**: 5
- **File**: `src/app/(app)/api/schedules/route.ts`
- **Change**: Accept `page`/`pageSize` query params.
- **Acceptance**: `/api/schedules?page=2&pageSize=20` returns the correct slice.

---

### FIX-025: Remove/stop writing stale `public_url` column

- **Phase**: 4
- **File**: `src/lib/storage/saveVariant.ts`, `003_post_variants.sql`
- **Change**: Stop writing `public_url` (always generated on-demand via `fetchVariants`). Optionally drop the column.
- **Acceptance**: `saveVariant()` no longer generates a signed URL during save.

---

### FIX-026: `NormalizedMetrics.currency` typed as literal `null`

- **Phase**: 6
- **File**: `src/lib/types/database.ts`
- **Change**: Change `currency: null` to `currency: string | null`.
- **Acceptance**: TypeScript allows setting `currency` to a string value.

---

### FIX-027: Inline `PostRow` type in analytics page

- **Phase**: 6
- **File**: `src/app/(app)/analytics/page.tsx`
- **Change**: Import the type from `database.ts` instead of defining inline.
- **Acceptance**: Single source of truth for the type.

---

### FIX-028: Add max-age cutoff for engagement ingestion

- **Phase**: 6
- **File**: `src/app/(app)/api/jobs/ingest-engagement-due/route.ts`
- **Change**: Add a filter like `AND published_at > NOW() - INTERVAL '90 days'` to avoid ingesting metrics for very old deliveries.
- **Acceptance**: Deliveries older than 90 days are skipped during ingestion.

---

### FIX-029: Remove dead `FORTY_EIGHT_HOURS_MS` constant

- **Phase**: 6
- **File**: `src/app/(app)/api/jobs/ingest-engagement-due/route.ts`
- **Change**: Delete the unused constant.
- **Acceptance**: No dead code.
