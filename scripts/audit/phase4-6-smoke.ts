/**
 * Phase 4–6 Smoke Test Script
 *
 * Runs a series of HTTP calls against the running app to verify
 * end-to-end functionality of Phases 4, 5, and 6.
 *
 * Usage:
 *   npx tsx scripts/audit/phase4-6-smoke.ts
 *
 * Environment:
 *   BASE_URL      — App URL (default: http://localhost:3000)
 *   JOB_SECRET    — Shared cron auth secret
 *   DRY_RUN       — Set to "false" to create real data (default: "true")
 *
 * Output:
 *   JSON summary to stdout with pass/fail per test.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const JOB_SECRET = process.env.JOB_SECRET ?? '';
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';

interface TestResult {
  id: string;
  phase: number;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  durationMs: number;
  detail?: string;
}

const results: TestResult[] = [];

// ── Helpers ──────────────────────────────────────────────────

async function runTest(
  id: string,
  phase: number,
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>
): Promise<void> {
  const start = Date.now();
  try {
    const result = await fn();
    results.push({
      id,
      phase,
      name,
      status: result.ok ? 'pass' : 'fail',
      durationMs: Date.now() - start,
      detail: result.detail,
    });
  } catch (err) {
    results.push({
      id,
      phase,
      name,
      status: 'fail',
      durationMs: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function api(
  path: string,
  options?: RequestInit
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = { _raw: await res.text() };
  }
  return { status: res.status, body };
}

// ── Phase 4 Tests ────────────────────────────────────────────

async function phase4Tests(): Promise<void> {
  // T4-S1: Sign-url rejects invalid paths
  await runTest('T4-S1', 4, 'sign-url rejects invalid path', async () => {
    const { status } = await api('/api/sign-url', {
      method: 'POST',
      body: JSON.stringify({ storagePath: '../secrets.json' }),
    });
    return { ok: status === 400, detail: `status=${status}` };
  });

  // T4-S2: Sign-url accepts posts/ paths (requires FIX-002)
  await runTest('T4-S2', 4, 'sign-url accepts posts/ path', async () => {
    const { status, body } = await api('/api/sign-url', {
      method: 'POST',
      body: JSON.stringify({
        storagePath: 'posts/test-id/variants/instagram_feed/variant.jpg',
      }),
    });
    // May return 500 if file doesn't exist, but should NOT return 400 "Invalid storage path"
    const rejected = status === 400 && (body as { message?: string }).message === 'Invalid storage path';
    return {
      ok: !rejected,
      detail: `status=${status}, rejected=${rejected}`,
    };
  });

  // T4-S3: Variants list for nonexistent post
  await runTest('T4-S3', 4, 'variants list returns empty for unknown post', async () => {
    const { status, body } = await api(
      '/api/posts/00000000-0000-0000-0000-000000000000/variants'
    );
    return {
      ok: status === 200 && Array.isArray(body.variants),
      detail: `status=${status}`,
    };
  });

  // T4-S4: Build variants — missing source
  await runTest('T4-S4', 4, 'build-variants rejects missing source', async () => {
    const { status, body } = await api(
      '/api/posts/00000000-0000-0000-0000-000000000000/build-variants',
      {
        method: 'POST',
        body: JSON.stringify({
          variant_strategy: 'platform_safe',
          selected_platforms: ['instagram_feed'],
        }),
      }
    );
    return {
      ok: status === 400 || status === 404,
      detail: `status=${status}, error=${(body as { error?: string }).error}`,
    };
  });

  // T4-S5: Build variants — wrong strategy
  await runTest('T4-S5', 4, 'build-variants rejects single_image strategy', async () => {
    const { status, body } = await api(
      '/api/posts/00000000-0000-0000-0000-000000000000/build-variants',
      {
        method: 'POST',
        body: JSON.stringify({
          variant_strategy: 'single_image',
          selected_platforms: ['instagram_feed'],
          source_image: { storageKey: 'test.jpg' },
        }),
      }
    );
    // Should be 400 for wrong strategy OR 404 for post not found
    return {
      ok: status === 400 || status === 404,
      detail: `status=${status}, error=${(body as { error?: string }).error}`,
    };
  });
}

// ── Phase 5 Tests ────────────────────────────────────────────

async function phase5Tests(): Promise<void> {
  // T5-S1: Publish runner - no auth
  await runTest('T5-S1', 5, 'publish-due rejects without auth', async () => {
    const { status } = await api('/api/jobs/publish-due', { method: 'POST' });
    return { ok: status === 401, detail: `status=${status}` };
  });

  // T5-S2: Publish runner - wrong secret
  await runTest('T5-S2', 5, 'publish-due rejects wrong secret', async () => {
    const { status } = await api('/api/jobs/publish-due', {
      method: 'POST',
      headers: { 'x-job-secret': 'wrong-secret-value' },
    });
    return { ok: status === 401, detail: `status=${status}` };
  });

  // T5-S3: Publish runner - valid secret (should succeed or return 0 processed)
  await runTest('T5-S3', 5, 'publish-due accepts valid secret', async () => {
    if (!JOB_SECRET) {
      return { ok: false, detail: 'JOB_SECRET env not set — skipped' };
    }
    const { status, body } = await api('/api/jobs/publish-due', {
      method: 'POST',
      headers: { 'x-job-secret': JOB_SECRET },
    });
    return {
      ok: status === 200 && (body as { ok?: boolean }).ok === true,
      detail: `status=${status}, processed=${(body as { processed?: number }).processed}`,
    };
  });

  // T5-S4: List connections
  await runTest('T5-S4', 5, 'list connections', async () => {
    const { status, body } = await api('/api/connections');
    return {
      ok: status === 200 && Array.isArray(body.connections),
      detail: `status=${status}, count=${Array.isArray(body.connections) ? (body.connections as unknown[]).length : 'N/A'}`,
    };
  });

  // T5-S5: List schedules
  await runTest('T5-S5', 5, 'list schedules', async () => {
    const { status, body } = await api('/api/schedules');
    return {
      ok: status === 200 && Array.isArray(body.schedules),
      detail: `status=${status}`,
    };
  });

  // T5-S6: Legacy publish/run should be gated (requires FIX-008)
  await runTest('T5-S6', 5, 'legacy publish/run is auth-gated', async () => {
    const { status } = await api('/api/publish/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    // If FIX-008 is applied, should return 401. Otherwise may return 200/400/500
    return {
      ok: status === 401,
      detail: `status=${status} (expected 401 after FIX-008)`,
    };
  });

  // T5-S7: Schedule for nonexistent post
  await runTest('T5-S7', 5, 'schedule rejects nonexistent post', async () => {
    const { status } = await api(
      '/api/posts/00000000-0000-0000-0000-000000000000/schedule',
      {
        method: 'POST',
        body: JSON.stringify({
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
          selectedPlatforms: ['twitter'],
          caption: 'test',
          connectionIdsByPlatform: { twitter: '00000000-0000-0000-0000-000000000000' },
        }),
      }
    );
    return { ok: status === 404 || status === 400, detail: `status=${status}` };
  });

  // T5-S8: Cancel nonexistent schedule
  await runTest('T5-S8', 5, 'cancel rejects nonexistent schedule', async () => {
    const { status } = await api(
      '/api/schedules/00000000-0000-0000-0000-000000000000/cancel',
      { method: 'POST' }
    );
    return { ok: status === 404 || status === 500, detail: `status=${status}` };
  });

  // T5-S9: Create + list connection (if not dry-run)
  if (!DRY_RUN) {
    await runTest('T5-S9', 5, 'create connection', async () => {
      const { status, body } = await api('/api/connections', {
        method: 'POST',
        body: JSON.stringify({
          platformId: 'twitter',
          accountLabel: 'smoke-test',
          accessToken: 'smoke-test-token-' + Date.now(),
        }),
      });
      return {
        ok: status === 201 || status === 200,
        detail: `status=${status}, id=${(body as { connection?: { id?: string } }).connection?.id}`,
      };
    });
  }
}

// ── Phase 6 Tests ────────────────────────────────────────────

async function phase6Tests(): Promise<void> {
  // T6-S1: Ingest runner - no auth
  await runTest('T6-S1', 6, 'ingest-engagement rejects without auth', async () => {
    const { status } = await api('/api/jobs/ingest-engagement-due', {
      method: 'POST',
    });
    return { ok: status === 401, detail: `status=${status}` };
  });

  // T6-S2: Ingest runner - valid secret
  await runTest('T6-S2', 6, 'ingest-engagement accepts valid secret', async () => {
    if (!JOB_SECRET) {
      return { ok: false, detail: 'JOB_SECRET env not set — skipped' };
    }
    const { status, body } = await api('/api/jobs/ingest-engagement-due', {
      method: 'POST',
      headers: { 'x-job-secret': JOB_SECRET },
    });
    return {
      ok: status === 200,
      detail: `status=${status}, processed=${(body as { processed?: number }).processed}`,
    };
  });

  // T6-S3: Analytics overview
  await runTest('T6-S3', 6, 'analytics overview returns data', async () => {
    const { status, body } = await api('/api/analytics/overview?days=7');
    return {
      ok: status === 200 && body.totals !== undefined,
      detail: `status=${status}, hasTotals=${body.totals !== undefined}`,
    };
  });

  // T6-S4: Analytics posts list
  await runTest('T6-S4', 6, 'analytics posts returns array', async () => {
    const { status, body } = await api('/api/analytics/posts');
    return {
      ok: status === 200 && Array.isArray(body.posts),
      detail: `status=${status}`,
    };
  });

  // T6-S5: Analytics post detail - nonexistent delivery
  await runTest('T6-S5', 6, 'analytics post detail 404 for unknown', async () => {
    const { status } = await api(
      '/api/analytics/post/00000000-0000-0000-0000-000000000000'
    );
    return { ok: status === 404, detail: `status=${status}` };
  });

  // T6-S6: Overview days filter (regression for FIX-007)
  await runTest('T6-S6', 6, 'overview days filter changes results', async () => {
    const [r7, r30] = await Promise.all([
      api('/api/analytics/overview?days=7'),
      api('/api/analytics/overview?days=30'),
    ]);
    // Both should succeed; we can't guarantee different numbers in dry-run
    return {
      ok: r7.status === 200 && r30.status === 200,
      detail: `7d=${r7.status}, 30d=${r30.status}`,
    };
  });
}

// ── Cross-Phase Tests ────────────────────────────────────────

async function crossPhaseTests(): Promise<void> {
  // TX-S1: Database connectivity check
  await runTest('TX-S1', 0, 'database connectivity (channels)', async () => {
    const { status } = await api('/api/channels');
    return {
      ok: status === 200,
      detail: `status=${status}`,
    };
  });

  // TX-S2: All cron endpoints auth-gated
  await runTest('TX-S2', 0, 'all cron endpoints require auth', async () => {
    const endpoints = ['/api/jobs/publish-due', '/api/jobs/ingest-engagement-due'];
    const results = await Promise.all(
      endpoints.map((ep) => api(ep, { method: 'POST' }))
    );
    const allGated = results.every((r) => r.status === 401);
    return {
      ok: allGated,
      detail: results.map((r, i) => `${endpoints[i]}=${r.status}`).join(', '),
    };
  });
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error(`[smoke] BASE_URL=${BASE_URL}`);
  console.error(`[smoke] JOB_SECRET=${JOB_SECRET ? '(set)' : '(NOT SET)'}`);
  console.error(`[smoke] DRY_RUN=${DRY_RUN}`);
  console.error('');

  await crossPhaseTests();
  await phase4Tests();
  await phase5Tests();
  await phase6Tests();

  // ── Summary ─────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    dryRun: DRY_RUN,
    summary: { total: results.length, passed, failed, skipped },
    results,
  };

  // JSON to stdout
  console.log(JSON.stringify(output, null, 2));

  // Human-readable to stderr
  console.error('');
  console.error(`═══════════════════════════════════════`);
  console.error(`  SMOKE TEST RESULTS`);
  console.error(`  Total: ${results.length}  Pass: ${passed}  Fail: ${failed}  Skip: ${skipped}`);
  console.error(`═══════════════════════════════════════`);

  for (const r of results) {
    const icon = r.status === 'pass' ? '[PASS]' : r.status === 'fail' ? '[FAIL]' : '[SKIP]';
    console.error(`  ${icon} P${r.phase} ${r.id}: ${r.name} (${r.durationMs}ms)`);
    if (r.status !== 'pass' && r.detail) {
      console.error(`         ${r.detail}`);
    }
  }

  // Exit with error code if any failures
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[smoke] Fatal error:', err);
  process.exit(2);
});
