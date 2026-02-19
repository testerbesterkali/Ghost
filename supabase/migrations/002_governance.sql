-- =========================================================
-- Ghost Platform: Layer 4 Governance & Memory
-- PRD §3.5 — Approval workflows, version control, feedback
-- =========================================================

-- Ghost version control (Git-like for Ghosts)
CREATE TABLE IF NOT EXISTS ghost_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ghost_id UUID NOT NULL REFERENCES ghosts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  execution_plan JSONB,
  parameters JSONB,
  trigger JSONB,
  change_description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ghost_id, version)
);

-- Approval requests with expiry
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ghost_id UUID NOT NULL REFERENCES ghosts(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES executions(id),
  org_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reason TEXT,
  decision_note TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- User feedback for RLHF
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  ghost_id UUID NOT NULL REFERENCES ghosts(id),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  corrected_actions JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization settings
CREATE TABLE IF NOT EXISTS org_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_approve_threshold NUMERIC(3,2) DEFAULT 0.95,
  max_executions_per_minute INTEGER DEFAULT 10,
  llm_provider TEXT DEFAULT 'openai',
  llm_model TEXT DEFAULT 'gpt-4o',
  require_approval_above_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automation policies (e.g., "block >$10K without approval")
CREATE TABLE IF NOT EXISTS automation_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition JSONB NOT NULL, -- e.g. {"field": "amount", "operator": ">", "value": 10000}
  action TEXT NOT NULL DEFAULT 'require_approval' CHECK (action IN ('require_approval', 'block', 'notify', 'allow')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ghost_versions_ghost ON ghost_versions(ghost_id);
CREATE INDEX idx_approval_requests_ghost ON approval_requests(ghost_id);
CREATE INDEX idx_approval_requests_org_status ON approval_requests(org_id, status);
CREATE INDEX idx_user_feedback_execution ON user_feedback(execution_id);
CREATE INDEX idx_user_feedback_ghost ON user_feedback(ghost_id);
CREATE INDEX idx_automation_policies_org ON automation_policies(org_id, is_active);

-- RLS policies
ALTER TABLE ghost_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_policies ENABLE ROW LEVEL SECURITY;

-- Tenant isolation for all new tables
CREATE POLICY tenant_ghost_versions ON ghost_versions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY tenant_approval_requests ON approval_requests
  FOR ALL USING (org_id = current_setting('app.current_org', true))
  WITH CHECK (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_user_feedback ON user_feedback
  FOR ALL USING (org_id = current_setting('app.current_org', true))
  WITH CHECK (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_org_settings ON org_settings
  FOR ALL USING (org_id = current_setting('app.current_org', true))
  WITH CHECK (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_automation_policies ON automation_policies
  FOR ALL USING (org_id = current_setting('app.current_org', true))
  WITH CHECK (org_id = current_setting('app.current_org', true));

-- Feedback immutability (can insert, cannot update/delete)
CREATE POLICY feedback_immutable ON user_feedback
  FOR UPDATE USING (false);
CREATE POLICY feedback_no_delete ON user_feedback
  FOR DELETE USING (false);
