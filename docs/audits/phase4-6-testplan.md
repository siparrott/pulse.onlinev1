# Phases 4–6 — Test Plan

**Generated**: 2025-07-21  
**Scope**: Phase 4 (Variant Builder), Phase 5 (Posting Pipeline), Phase 6 (Engagement Analytics)

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| Node.js | 18+ |
| Supabase | Local (`npx supabase start`) or remote with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| Environment | `.env.local` with `JOB_SECRET`, `TOKEN_ENCRYPTION_KEY` (64-char hex), `WEBHOOK_PUBLISHER_URL` (optional) |
| Dev server | `npm run dev` running on `http://localhost:3000` |
| Test runner | Vitest (`npm test`) |
| cURL / HTTPie | For manual API testing |
| Sample image | Any JPEG/PNG ≥ 1080×1080 for variant builder tests |

---

## 2. Phase 4 — Variant Builder Tests

### 2.1 Unit Tests (Vitest)

| ID | Test | File | What to Verify |
|----|------|------|----------------|
| T4-U1 | `buildVariants()` produces correct dimensions for all 9 specs | `src/tests/variant-builder.test.ts` | Each output buffer matches `width × height` from `specs.ts`; `format` is `'jpg'` |
| T4-U2 | `buildVariants()` with undersized source logs upscale warnings | same | `upscaleWarning: true` for platforms larger than source |
| T4-U3 | `buildVariants()` with invalid buffer rejects gracefully | same | Returns `errors[]` without crashing |
| T4-U4 | `saveVariant()` without Supabase returns local-only record | `src/tests/save-variant.test.ts` | UUID id, correct storageKey format, no DB calls |
| T4-U5 | `mimeFor()` returns correct MIME types | inline in saveVariant | `'jpg' → 'image/jpeg'`, `'png' → 'image/png'`, `'webp' → 'image/webp'` |
| T4-U6 | Platform specs all define required fields | `src/tests/specs.test.ts` | Every spec has `id`, `width`, `height`, `aspectRatio`, `outputFormat` |

### 2.2 Integration Tests (API — manual or smoke script)

| ID | Test | Endpoint | Method | Body / Setup | Expected |
|----|------|----------|--------|--------------|----------|
| T4-I1 | Upload source image | `POST /api/upload-source` | POST | `multipart/form-data` with `file` and `postId` | 200, `{ storageKey: "posts/{id}/source/…" }` |
| T4-I2 | Build variants (happy path) | `POST /api/posts/:id/build-variants` | POST | `{ variant_strategy: "platform_safe", selected_platforms: ["instagram_feed", "twitter"], source_image: { storageKey: "…" } }` | 200, `{ ok: true, variants: [{…}] }` |
| T4-I3 | Build variants — missing source | same | POST | `{ variant_strategy: "platform_safe", selected_platforms: ["instagram_feed"] }` | 400, `source_image.storageKey is required` |
| T4-I4 | Build variants — wrong strategy | same | POST | `{ variant_strategy: "single_image" }` | 400, `variant_strategy must be "platform_safe"` |
| T4-I5 | List variants | `GET /api/posts/:id/variants` | GET | — | 200, array of variant objects with signed URLs |
| T4-I6 | Export variants (ZIP) | `GET /api/posts/:id/export-variants` | GET | Post must have built variants | 200, content-type `application/zip` |
| T4-I7 | Re-sign URL | `POST /api/sign-url` | POST | `{ storagePath: "posts/{id}/variants/…" }` | 200, `{ signedUrl: "…" }` (requires FIX-002) |
| T4-I8 | Re-sign URL — invalid path | same | POST | `{ storagePath: "../secrets.json" }` | 400, `Invalid storage path` |

### 2.3 Regression Tests (Post-Fix)

| ID | Test | Validates Fix |
|----|------|---------------|
| T4-R1 | Re-build same post+platform twice → no duplicate DB rows | FIX-001 (UNIQUE constraint) |
| T4-R2 | `updatePost()` with `variant_strategy` persists to Supabase | FIX-003 (CLIENT_ONLY_FIELDS) |
| T4-R3 | Sign-url accepts `posts/…` paths | FIX-002 |

---

## 3. Phase 5 — Posting Pipeline Tests

### 3.1 Unit Tests (Vitest)

| ID | Test | File | What to Verify |
|----|------|------|----------------|
| T5-U1 | `encrypt()` → `decrypt()` roundtrip | `src/tests/encryption.test.ts` | Plain text survives roundtrip; different IVs produce different ciphertexts |
| T5-U2 | `decrypt()` with wrong key throws | same | Error on tampered or different key |
| T5-U3 | `encryptToken()` without `TOKEN_ENCRYPTION_KEY` returns plaintext | `src/tests/tokens.test.ts` | Passthrough behavior |
| T5-U4 | `isTokenExpired()` with past/future/null dates | same | Correct boolean for each case |
| T5-U5 | `createDryRunPublisher()` returns `ok: true` with `dryRun: true` raw | `src/tests/publisher.test.ts` | All dry-run publishers validate and publish successfully |
| T5-U6 | `getPublisher()` auto-creates dry-run for unknown platform | same | Returns publisher, `hasRealPublisher()` returns false |
| T5-U7 | Backoff schedule produces correct delays per attempt | `src/tests/publish-backoff.test.ts` | 5min, 30min, 2h, 12h, null (exhausted) |

### 3.2 Integration Tests (API)

| ID | Test | Endpoint | Method | Setup | Expected |
|----|------|----------|--------|-------|----------|
| T5-I1 | Create connection | `POST /api/connections` | POST | `{ platformId: "twitter", accountLabel: "test", accessToken: "tok123" }` | 201, token not in response |
| T5-I2 | List connections | `GET /api/connections` | GET | — | 200, no `access_token_encrypted` field |
| T5-I3 | Disconnect | `POST /api/connections/:id/disconnect` | POST | — | 200, `status: "revoked"` |
| T5-I4 | Schedule post (happy path) | `POST /api/posts/:id/schedule` | POST | Valid body with existing post + connections | 201, schedule + deliveries returned |
| T5-I5 | Schedule — missing connection | same | POST | `connectionIdsByPlatform` references non-existent ID | 400 |
| T5-I6 | Schedule — revoked connection | same | POST | Connection with `status: 'revoked'` | 400, "not connected" |
| T5-I7 | Cancel schedule | `POST /api/schedules/:id/cancel` | POST | Schedule in `scheduled` status | 200, deliveries set to `skipped` |
| T5-I8 | Cancel — already publishing | same | POST | Schedule in `publishing` status | 409 |
| T5-I9 | List schedules | `GET /api/schedules` | GET | — | 200, array with joined post + deliveries |
| T5-I10 | Schedule detail | `GET /api/schedules/:id` | GET | — | 200, full delivery detail |
| T5-I11 | Publish runner — no auth | `POST /api/jobs/publish-due` | POST | No `x-job-secret` header | 401 |
| T5-I12 | Publish runner — dry run | `POST /api/jobs/publish-due` | POST | `x-job-secret` header, due schedule exists | 200, all deliveries published (dry-run) |
| T5-I13 | Publish runner — no due schedules | same | POST | No schedules due | 200, `processed: 0` |

### 3.3 End-to-End Flow

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| T5-E1 | Full publish cycle | 1. Create post → 2. Create connection → 3. Build variants → 4. Schedule → 5. Run publish job → 6. Verify deliveries published | All deliveries `status: 'published'`, post `status: 'published'` |
| T5-E2 | Retry flow | 1. Schedule → 2. Mock publisher to fail → 3. Run job → 4. Verify `failed` with `next_retry_at` → 5. Advance time → 6. Re-run → 7. Mock success → 8. Verify published | Delivery retried and eventually published |
| T5-E3 | Cancel mid-queue | 1. Schedule → 2. Cancel → 3. Run publish job → 4. Verify no deliveries processed | Schedule `cancelled`, deliveries `skipped`, post `draft` |

### 3.4 Regression Tests (Post-Fix)

| ID | Test | Validates Fix |
|----|------|---------------|
| T5-R1 | All deliveries fail 5 times → schedule becomes `failed` | FIX-004 |
| T5-R2 | Expired token detected by publish runner | FIX-005 |
| T5-R3 | Legacy `/api/publish/run` returns 401 without auth | FIX-008 |
| T5-R4 | single_image post has image attached during publish | FIX-015 |
| T5-R5 | Hung publisher times out after 30s | FIX-010 |

---

## 4. Phase 6 — Engagement Analytics Tests

### 4.1 Unit Tests (Vitest)

| ID | Test | File | What to Verify |
|----|------|------|----------------|
| T6-U1 | `computeEngagementRate()` returns correct rate | `src/tests/compute.test.ts` | `(likes + comments + shares) / impressions` or `null` when impressions = 0 |
| T6-U2 | `deltaSincePrevious()` computes correct deltas | same | Each field is `current - previous` |
| T6-U3 | `detectMilestones()` fires at thresholds | same | Crossing 100, 1K, 10K, etc. |
| T6-U4 | `detectSpike()` detects > threshold percentage jumps | same | Returns spike info when delta exceeds threshold |
| T6-U5 | `createDryRunMetricsFetcher()` returns deterministic metrics | `src/tests/metrics-fetcher.test.ts` | Same inputs → same outputs; metrics grow over time |
| T6-U6 | `hasRealMetricsFetcher()` returns false for dry-run | same | Requires FIX-006 |
| T6-U7 | `getMetricsFetcher()` auto-creates dry-run | same | Returns fetcher for any platform ID |

### 4.2 Integration Tests (API)

| ID | Test | Endpoint | Method | Setup | Expected |
|----|------|----------|--------|-------|----------|
| T6-I1 | Ingest runner — no auth | `POST /api/jobs/ingest-engagement-due` | POST | No header | 401 |
| T6-I2 | Ingest runner — happy path | same | POST | `x-job-secret`, published deliveries exist | 200, snapshots created, rollups updated |
| T6-I3 | Ingest runner — no published deliveries | same | POST | No deliveries | 200, `processed: 0` |
| T6-I4 | Overview API | `GET /api/analytics/overview?days=7` | GET | Rollups + snapshots exist | 200, totals + timeSeries |
| T6-I5 | Posts API | `GET /api/analytics/posts` | GET | — | 200, array of post rows |
| T6-I6 | Post detail API | `GET /api/analytics/post/:deliveryId` | GET | Valid delivery ID | 200, rollup + delivery + snapshots + events |
| T6-I7 | Post detail — invalid ID | same | GET | Random UUID | 404 |

### 4.3 End-to-End Flow

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| T6-E1 | Full analytics cycle | 1. Create + publish post (dry-run) → 2. Run ingest job → 3. Check analytics overview | Non-zero totals, time-series data, post appears in posts list |
| T6-E2 | Spike detection | 1. Ingest twice with growing metrics → 2. Check events table | Spike events created when delta exceeds threshold |
| T6-E3 | Error isolation | 1. Ingest with one connection broken → 2. Verify other deliveries still ingested | Error snapshot for broken delivery, success for others |

### 4.4 Regression Tests (Post-Fix)

| ID | Test | Validates Fix |
|----|------|---------------|
| T6-R1 | `hasRealMetricsFetcher()` returns false for all initial platforms | FIX-006 |
| T6-R2 | Overview totals change with `days` filter | FIX-007 |
| T6-R3 | Time-series doesn't double-count cumulative snapshots | FIX-012 |
| T6-R4 | Concurrent ingest runs don't create duplicate rollups | FIX-011 |

---

## 5. Cross-Phase Integration Tests

| ID | Test | Phases | Steps | Expected |
|----|------|--------|-------|----------|
| T-X1 | Variant → Publish → Analytics | 4→5→6 | 1. Upload source → 2. Build variants → 3. Create connection → 4. Schedule → 5. Publish (dry-run) → 6. Ingest engagement → 7. View analytics | Complete data flow; analytics show engagement for published post |
| T-X2 | Single image publish | 4→5 | 1. Post with `single_image` strategy → 2. Schedule → 3. Publish | Image attached to delivery (requires FIX-015) |
| T-X3 | Re-sign variant URL | 4 | 1. Build variants → 2. Wait 1h+ → 3. Call sign-url with variant path | Fresh signed URL returned (requires FIX-002) |

---

## 6. Automated Test File Map

| Test File (to create) | Covers |
|------------------------|--------|
| `src/tests/variant-builder.test.ts` | T4-U1 through T4-U3 |
| `src/tests/save-variant.test.ts` | T4-U4, T4-U5 |
| `src/tests/encryption.test.ts` | T5-U1, T5-U2 |
| `src/tests/tokens.test.ts` | T5-U3, T5-U4 |
| `src/tests/publisher.test.ts` | T5-U5, T5-U6 |
| `src/tests/compute.test.ts` | T6-U1 through T6-U4 |
| `src/tests/metrics-fetcher.test.ts` | T6-U5 through T6-U7 |
| `scripts/audit/phase4-6-smoke.ts` | All integration tests (T4-I*, T5-I*, T6-I*) |
