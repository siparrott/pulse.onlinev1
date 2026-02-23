-- Phase 7: Automation Layer
-- Rules engine, action logs, approvals, and audit trail

------------------------------------------------------------
-- 1) AUTOMATION RULES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL DEFAULT 'default',
  name              TEXT NOT NULL,
  is_enabled        BOOLEAN NOT NULL DEFAULT false,
  platform_id       TEXT NOT NULL DEFAULT 'facebook',
  scope             TEXT NOT NULL DEFAULT 'all_posts'
    CHECK (scope IN ('all_posts', 'tagged_posts', 'single_post')),
  scope_ref_id      UUID,
  conditions        JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions           JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints       JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_platform
  ON automation_rules(user_id, platform_id, is_enabled);

------------------------------------------------------------
-- 2) AUTOMATION RUNS (evaluation audit log)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL DEFAULT 'default',
  rule_id     UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  ok          BOOLEAN NOT NULL DEFAULT true,
  summary     JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

------------------------------------------------------------
-- 3) AUTOMATION ACTION LOGS (per-action audit)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_action_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL DEFAULT 'default',
  rule_id           UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  post_schedule_id  UUID REFERENCES post_schedules(id) ON DELETE SET NULL,
  post_delivery_id  UUID REFERENCES post_deliveries(id) ON DELETE SET NULL,
  platform_id       TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'approved', 'executing', 'done', 'failed', 'skipped', 'blocked')),
  reason            TEXT,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_action_id TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  next_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_status_retry
  ON automation_action_logs(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_action_logs_user_created
  ON automation_action_logs(user_id, created_at DESC);

------------------------------------------------------------
-- 4) AUTOMATION APPROVALS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_log_id UUID NOT NULL REFERENCES automation_action_logs(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_at    TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

------------------------------------------------------------
-- 5) TRIGGERS for updated_at
------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_automation()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_automation();

CREATE TRIGGER trg_automation_action_logs_updated_at
  BEFORE UPDATE ON automation_action_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_automation();
