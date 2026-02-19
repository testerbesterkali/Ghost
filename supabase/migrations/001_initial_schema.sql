-- Ghost Platform Database Schema
-- Supabase PostgreSQL migration
-- PRD §5.2: Critical RLS policies + tables for all layers

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for intent vectors

-- =============================================================================
-- LAYER 1: Secure Events (ingested from browser extension)
-- =============================================================================

CREATE TABLE IF NOT EXISTS secure_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_fingerprint TEXT NOT NULL,
  timestamp_bucket TIMESTAMPTZ NOT NULL,
  intent_vector REAL[] NOT NULL, -- 128-dim intent vector
  structural_hash TEXT NOT NULL,
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('dom_mut', 'user_int', 'network', 'error')),
  intent_label TEXT NOT NULL,
  intent_confidence REAL NOT NULL CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  element_signature TEXT,
  sequence_number INTEGER NOT NULL,
  device_fingerprint TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_secure_events_org ON secure_events(org_id, ingested_at DESC);
CREATE INDEX idx_secure_events_session ON secure_events(session_fingerprint);
CREATE INDEX idx_secure_events_intent ON secure_events(intent_label);
CREATE INDEX idx_secure_events_batch ON secure_events(batch_id);

-- =============================================================================
-- LAYER 2: Detected Patterns (output of pattern-detector)
-- =============================================================================

CREATE TABLE IF NOT EXISTS detected_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL,
  intent_sequence TEXT[] NOT NULL,
  structural_hashes TEXT[] NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  suggested_name TEXT,
  suggested_description TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'needs_review' 
    CHECK (status IN ('needs_review', 'auto_suggested', 'approved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_detected_patterns_org ON detected_patterns(org_id, status);
CREATE INDEX idx_detected_patterns_confidence ON detected_patterns(confidence DESC);

-- =============================================================================
-- LAYER 3: Ghosts (automation templates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ghosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'active', 'paused', 'archived')),
  trigger JSONB NOT NULL DEFAULT '{}',
  parameters JSONB NOT NULL DEFAULT '[]',
  execution_plan JSONB NOT NULL DEFAULT '[]',
  confidence REAL,
  source_pattern_id UUID REFERENCES detected_patterns(id),
  created_by TEXT,
  approved_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  usage_stats JSONB NOT NULL DEFAULT '{"observedCount": 0, "userCount": 0, "avgExecutionTime": 0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ghosts_org ON ghosts(org_id, status);
CREATE INDEX idx_ghosts_active ON ghosts(is_active) WHERE is_active = true;

-- =============================================================================
-- LAYER 3: Executions
-- =============================================================================

CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ghost_id UUID NOT NULL REFERENCES ghosts(id),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  parameters JSONB NOT NULL DEFAULT '{}',
  trigger TEXT NOT NULL DEFAULT 'manual',
  step_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_executions_ghost ON executions(ghost_id, started_at DESC);
CREATE INDEX idx_executions_status ON executions(status);

CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  strategy TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_steps_exec ON execution_steps(execution_id);

-- =============================================================================
-- LAYER 4: Execution Logs (immutable audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL,
  ghost_id UUID NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  strategies_used TEXT[] NOT NULL DEFAULT '{}',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_org ON execution_logs(org_id, logged_at DESC);
CREATE INDEX idx_execution_logs_ghost ON execution_logs(ghost_id);

-- =============================================================================
-- RLS POLICIES (PRD §5.2)
-- =============================================================================

ALTER TABLE secure_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: Users can only access their org's data
CREATE POLICY tenant_isolation_events ON secure_events
  FOR ALL USING (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_patterns ON detected_patterns
  FOR ALL USING (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_ghosts ON ghosts
  FOR ALL USING (org_id = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_logs ON execution_logs
  FOR ALL USING (org_id = current_setting('app.current_org', true));

-- Audit immutability: Logs can only be inserted, not modified or deleted
CREATE POLICY audit_append_only ON execution_logs
  FOR INSERT WITH CHECK (true);

-- Service role bypass for edge functions
CREATE POLICY service_role_full_access_events ON secure_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_patterns ON detected_patterns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_ghosts ON ghosts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_executions ON executions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_steps ON execution_steps
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_logs ON execution_logs
  FOR ALL USING (auth.role() = 'service_role');
