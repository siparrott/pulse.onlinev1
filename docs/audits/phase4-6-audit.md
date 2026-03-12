# Phases 4–6 — End-to-End Systems Audit

**Generated**: 2025-07-21  
**Auditor**: QA + Systems Auditor (automated)  
**Scope**: Phase 4 (Deterministic Variant Builder), Phase 5 (Posting Pipeline), Phase 6 (Engagement Analytics)  
**Commit**: `a9959d3` (main)

---

## Executive Summary

Phases 4–6 are **structurally complete** — every layer (DB schema, storage, API routes, job runners, UI pages) exists and the code compiles cleanly.  However, the audit uncovered **8 HIGH-severity** issues, **11 MEDIUM-severity** issues, and **10 LOW-severity** bugs, gaps, and security concerns across the three phases.

**Top-line risks:**
1. The `post_variants` table is **missing a UNIQUE constraint** → the `saveVariant` upsert will fail silently at runtime (Phase 4, correctness).
2. The sign-url route **rejects variant paths** (`posts/…`) due to a `startsWith('ai/')` guard — Phase 4 images cannot be re-signed (Phase 4→5 wiring).
3. Phase 4 fields (`source_image`, `selected_platforms`, `variant_strategy`) are listed in `CLIENT_ONLY_FIELDS` in `posts.ts` and **never written** to Supabase via the client-side `updatePost` path — the build-variants API can only work if the body override is supplied (wiring gap).
4. The publish runner reads `connection.status` from a **stale local object** after `rotateTokensIfNeeded()` mutates the DB — expired tokens won't be caught (Phase 5, correctness).
5. `allFinalFailed` in the publish runner uses the **original `deliveries`** array (pre-processing) instead of `allDeliveries` (post-processing) — schedules may never transition to `'failed'` (Phase 5, correctness).
6. `hasRealMetricsFetcher()` **always returns `true`** because it checks `platformId.startsWith('dry-run-')`, but dry-run fetchers use real platform IDs (Phase 6, correctness).
7. Overview API **ignores the `days` filter** for metric totals — dashboard headline numbers are always all-time (Phase 6, data integrity).
8. The legacy `/api/publish/run` route has **zero auth** and uses the old Supabase singleton client, bypassing the Phase 5 pipeline entirely.

---

## 1. Inventory

### Phase 4 — Deterministic Variant Builder

| File | Lines | Role |
|------|-------|------|
| `supabase/migrations/003_post_variants.sql` | 40 | DB schema: `post_variants` + `variant_build_logs` |
| `src/lib/platforms/specs.ts` | ~120 | 9 platform specs (dimensions, aspect ratio) |
| `src/lib/images/variantBuilder.ts` | ~180 | Sharp-based image resizer |
| `src/lib/storage/saveVariant.ts` | 212 | Save/fetch/delete variants + log builds |
| `src/app/(app)/api/posts/[id]/build-variants/route.ts` | 158 | POST — trigger variant build |
| `src/app/(app)/api/posts/[id]/export-variants/route.ts` | ~100 | GET — ZIP export |
| `src/app/(app)/api/posts/[id]/variants/route.ts` | ~50 | GET — list variants |
| `src/app/(app)/api/upload-source/route.ts` | ~80 | POST — upload source image |
| `src/app/(app)/api/sign-url/route.ts` | 57 | POST — re-sign expired URLs |

### Phase 5 — Posting Pipeline

| File | Lines | Role |
|------|-------|------|
| `supabase/migrations/004_posting_pipeline.sql` | ~130 | DB: connections, schedules, deliveries, job_run_logs |
| `src/app/(app)/api/connections/route.ts` | ~100 | GET/POST connections |
| `src/app/(app)/api/connections/[id]/disconnect/route.ts` | ~40 | POST disconnect |
| `src/app/(app)/api/posts/[id]/schedule/route.ts` | 200 | POST — create schedule + deliveries |
| `src/app/(app)/api/jobs/publish-due/route.ts` | 280 | POST — publish runner (cron) |
| `src/app/(app)/api/schedules/route.ts` | ~50 | GET — list schedules |
| `src/app/(app)/api/schedules/[id]/route.ts` | ~50 | GET — schedule detail |
| `src/app/(app)/api/schedules/[id]/cancel/route.ts` | ~60 | POST — cancel schedule |
| `src/app/(app)/api/publish/run/route.ts` | ~80 | POST — legacy publish (dead code) |
| `src/app/(app)/publishing/page.tsx` | 331 | Publishing dashboard UI |
| `src/lib/platforms/publishers/types.ts` | ~30 | Publisher interface |
| `src/lib/platforms/publishers/index.ts` | ~35 | Publisher registry |
| `src/lib/platforms/publishers/dryRun.ts` | ~50 | Dry-run publisher factory |
| `src/lib/platforms/publishers/webhook.ts` | ~60 | Webhook publisher |
| `src/lib/platforms/tokens.ts` | ~80 | Token encrypt/decrypt/rotate |
| `src/lib/encryption.ts` | ~50 | AES-256-GCM encryption core |

### Phase 6 — Engagement Analytics

| File | Lines | Role |
|------|-------|------|
| `supabase/migrations/005_engagement_ingestion.sql` | 71 | DB: snapshots, rollups, events |
| `src/lib/platforms/metrics/types.ts` | 30 | MetricsFetcher interface |
| `src/lib/platforms/metrics/dryRun.ts` | 79 | Dry-run metrics fetcher |
| `src/lib/platforms/metrics/index.ts` | 35 | Metrics fetcher registry |
| `src/lib/metrics/compute.ts` | 102 | Engagement rate, deltas, milestones, spikes |
| `src/app/(app)/api/jobs/ingest-engagement-due/route.ts` | 277 | POST — ingest runner (cron) |
| `src/app/(app)/api/analytics/overview/route.ts` | 97 | GET — aggregate overview |
| `src/app/(app)/api/analytics/posts/route.ts` | 65 | GET — per-delivery list |
| `src/app/(app)/api/analytics/post/[id]/route.ts` | 73 | GET — single delivery detail |
| `src/app/(app)/analytics/page.tsx` | 428 | Analytics dashboard (Overview/Posts/Platforms) |
| `src/app/(app)/analytics/[id]/page.tsx` | 326 | Per-delivery detail page |

---

## 2. Happy-Path Checklist

| # | Flow | Status | Notes |
|---|------|--------|-------|
| HP-1 | Upload source image → `upload-source` API → Supabase Storage | ✅ Works | No path validation on upload (security issue) |
| HP-2 | Build variants → `build-variants` API → Sharp → `saveVariant` | ⚠️ Fragile | Requires body override for `source_image`, `selected_platforms`; upsert relies on missing UNIQUE constraint |
| HP-3 | List variants → `variants` API → `fetchVariants()` | ✅ Works | N+1 signed URL generation (perf) |
| HP-4 | Export variants → `export-variants` API → ZIP → response | ✅ Works | Buffers entire ZIP in memory |
| HP-5 | Re-sign URLs → `sign-url` API | ❌ Broken | Rejects `posts/…` paths — only allows `ai/` prefix |
| HP-6 | Create connection → `connections` POST | ✅ Works | Tokens encrypted before insert |
| HP-7 | Schedule post → `schedule` API → creates schedule + deliveries | ✅ Works | Variant keys wired for `platform_safe` strategy |
| HP-8 | Publish runner → claims due schedules → publishes | ⚠️ Bugs | Stale `connection.status`, stale `allFinalFailed` check |
| HP-9 | Cancel schedule → `cancel` API | ⚠️ Race | No atomic locking vs. runner |
| HP-10 | Publishing dashboard UI | ✅ Works | Manual refresh only |
| HP-11 | Ingest engagement → cron runner → metrics → snapshots + rollups | ✅ Works | Well-isolated per-delivery error handling |
| HP-12 | Analytics overview API → totals + time series | ⚠️ Data bug | `days` filter only applies to time series, not totals |
| HP-13 | Analytics posts API → per-delivery rows | ✅ Works | No pagination |
| HP-14 | Analytics post detail → snapshots + events | ✅ Works | Limited to 20 rows |
| HP-15 | Analytics dashboard UI → tabs | ✅ Works | Silent error swallowing |

---

## 3. Failure-Path Checklist

| # | Scenario | Handled? | Notes |
|---|----------|----------|-------|
| FP-1 | Source image download fails mid-build | ✅ | Returns 400 with error message |
| FP-2 | Sharp resize fails for one platform | ✅ | Per-platform try/catch, logged as warning |
| FP-3 | Storage upload fails during variant save | ✅ | Throws, caught by build-variants route |
| FP-4 | DB upsert fails (missing UNIQUE constraint) | ❌ | Will throw DB error at runtime; no fallback |
| FP-5 | Connection deleted while schedule has FK | ⚠️ | No `ON DELETE CASCADE` on `post_deliveries.connection_id` — FK violation |
| FP-6 | Token expired during publish | ⚠️ | `rotateTokensIfNeeded` is a stub; marks expired but not caught by stale local object |
| FP-7 | Publisher.publish() hangs indefinitely | ❌ | No timeout on publisher calls |
| FP-8 | Concurrent cron runs claim same schedule | ✅ | Atomic UPDATE…WHERE status=scheduled |
| FP-9 | Delivery exhausts MAX_ATTEMPTS retries | ⚠️ | Status detection uses stale data (bug) |
| FP-10 | Metrics fetcher fails for one delivery | ✅ | Error snapshot logged, continues batch |
| FP-11 | Concurrent ingest runs create duplicate rollups | ⚠️ | SELECT + INSERT/UPDATE is not atomic |
| FP-12 | Analytics API returns 500 | ✅ | try/catch → 500 response |
| FP-13 | Analytics UI fetch fails | ❌ | Empty `catch {}` blocks — errors silently swallowed |

---

## 4. Security Findings

| # | Severity | File | Finding |
|---|----------|------|---------|
| S-1 | HIGH | `sign-url/route.ts` | Uses old `supabase` singleton client instead of `createServerClient()` |
| S-2 | HIGH | `publish/run/route.ts` | Legacy route with **zero auth** — bypasses Phase 5 pipeline |
| S-3 | MEDIUM | All Phase 4 API routes | No authentication or authorization checks |
| S-4 | MEDIUM | All 3 analytics API routes | No authentication — any caller can read all engagement data |
| S-5 | MEDIUM | `upload-source/route.ts` | No path validation — caller controls storage path |
| S-6 | LOW | `encryption.ts` / `tokens.ts` | Dev fallback: if `TOKEN_ENCRYPTION_KEY` is unset, tokens stored as plaintext |
| S-7 | LOW | `connections/route.ts` | No auth on connection CRUD — appropriate for single-user but not multi-tenant |
| S-8 | LOW | `disconnect/route.ts` | Does not clear encrypted tokens from DB — revoked tokens remain encrypted in storage |

---

## 5. Data Model Findings

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| D-1 | HIGH | `003_post_variants.sql` | Missing `UNIQUE(post_id, platform_id)` — `saveVariant.ts` calls `.upsert({ onConflict: 'post_id,platform_id' })` which requires this constraint |
| D-2 | HIGH | `posts.ts` CLIENT_ONLY_FIELDS | Phase 4 fields (`source_image`, `selected_platforms`, `variant_strategy`) are blocked from Supabase writes — DB columns exist (003 migration) but client-side `updatePost()` never populates them |
| D-3 | MEDIUM | `004_posting_pipeline.sql` | No `ON DELETE CASCADE` on `post_deliveries.connection_id` FK — orphans possible |
| D-4 | MEDIUM | `003_post_variants.sql` | `public_url` stores time-limited signed URLs that expire in 1 hour — stale by design |
| D-5 | MEDIUM | `004_posting_pipeline.sql` | No unique constraint preventing duplicate schedules for the same post |
| D-6 | MEDIUM | `database.ts` | `selected_platforms` typed as `string[]` not `PlatformSpecId[]`; requires unsafe cast in build-variants |
| D-7 | LOW | `004_posting_pipeline.sql` | `platform_id` on `post_deliveries` is free-text `TEXT` — no FK or check constraint |
| D-8 | LOW | `NormalizedMetrics` type | `currency: null` is a literal `null` type — can never hold a real value |

---

## 6. Performance Findings

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| P-1 | MEDIUM | `saveVariant.ts` `fetchVariants()` | N+1 signed URL generation — one `createSignedUrl()` call per variant row |
| P-2 | MEDIUM | `export-variants/route.ts` | Entire ZIP buffered in memory before streaming response |
| P-3 | MEDIUM | `overview/route.ts` | All rollups loaded into JS memory for aggregation — should be a DB-side SUM |
| P-4 | LOW | `variantBuilder.ts` | Sequential Sharp processing — could parallelize with `Promise.all()` |
| P-5 | LOW | `schedule/route.ts` | Per-platform connection validation is sequential N+1 queries |
| P-6 | LOW | `overview/route.ts` & `posts/route.ts` | No pagination — unbounded result sets |

---

## 7. Cross-Phase Wiring Assessment

### Phase 4 → Phase 5 (Variant → Publish)

| Wiring Point | Status | Details |
|-------------|--------|---------|
| `variant_storage_key` on deliveries | ✅ Wired | Schedule route looks up `post_variants` by `post_id + platform_id` for `platform_safe` strategy |
| Image download during publish | ✅ Wired | Publish runner downloads from Supabase Storage using `variant_storage_key` |
| `single_image` strategy image | ❌ Not wired | When `variant_strategy !== 'platform_safe'`, `variant_storage_key` is always `null` — no image attached during publish |
| Sign-url for variant images | ❌ Broken | `sign-url/route.ts` rejects `posts/…` paths — cannot re-sign variant URLs |
| Phase 4 fields in Supabase | ❌ Not wired | `source_image`, `selected_platforms`, `variant_strategy` blocked from client-side DB writes by `CLIENT_ONLY_FIELDS` |

### Phase 5 → Phase 6 (Publish → Analytics)

| Wiring Point | Status | Details |
|-------------|--------|---------|
| `platform_post_id` on deliveries | ✅ Wired | Publish runner saves `platformPostId` from publish result; ingest runner filters on `platform_post_id IS NOT NULL` |
| Connection lookup for metrics | ✅ Wired | Ingest runner fetches connections by IDs from deliveries |
| Delivery → rollup → snapshot chain | ✅ Wired | Full data flow from delivery IDs through rollups to snapshots and events |

### Overall Verdict

Phase 5→6 wiring is **solid**. Phase 4→5 wiring has **three significant gaps** (sign-url rejection, single_image strategy, CLIENT_ONLY_FIELDS) that need to be addressed for end-to-end reliability.

---

## 8. Gaps & Recommendations

### Must Fix (Correctness / Data Integrity)

1. **Add UNIQUE constraint** on `post_variants(post_id, platform_id)` — required for upsert to work
2. **Fix sign-url path validation** — accept `posts/` prefix in addition to `ai/`
3. **Remove Phase 4 fields from CLIENT_ONLY_FIELDS** or add a dedicated server-side write path
4. **Fix `allFinalFailed`** in publish runner — use `allDeliveries` array and check each delivery's own attempts
5. **Re-fetch connection after `rotateTokensIfNeeded()`** or make the function return the updated status
6. **Fix `hasRealMetricsFetcher()`** — use an instance flag instead of string prefix check
7. **Fix overview API `days` filter** — apply date filter to rollup totals, not just time series

### Should Fix (Reliability / Security)

8. **Add auth or remove** the legacy `/api/publish/run` route
9. **Add `ON DELETE SET NULL`** on `post_deliveries.connection_id` FK
10. **Add abort/timeout** on `publisher.publish()` calls
11. **Make rollup upsert atomic** — use Supabase `.upsert()` with `onConflict: 'post_delivery_id'`
12. **Fix time-series double-counting** — use latest snapshot per delivery per day, or deltas
13. **Wire `single_image` strategy** — attach source image buffer when no variant exists
14. **Use `createServerClient()`** in sign-url route instead of the old singleton

### Nice to Have (Polish / Scale)

15. Add pagination to schedules listing and analytics APIs
16. Parallelize Sharp variant building with `Promise.all()`
17. Batch signed URL generation (or use public bucket policies)
18. Add user feedback for analytics UI fetch errors
19. Add auto-refresh / polling on publishing dashboard
20. Remove stale `public_url` column or replace with on-demand signing
