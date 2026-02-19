/**
 * Shared types for Supabase Edge Functions.
 * Mirrors the SecureEvent schema from the browser extension.
 */

/** SecureEvent as received from the browser extension (PRD §3.2) */
export interface SecureEvent {
    sessionFingerprint: string;
    timestampBucket: string;
    intentVector: number[];
    structuralHash: string;
    orgId: string;
    eventType: 'dom_mut' | 'user_int' | 'network' | 'error';
    intentLabel: string;
    intentConfidence: number;
    elementSignature: string | null;
    sequenceNumber: number;
}

/** Batch payload from the extension (PRD §7.1) */
export interface SecureEventBatch {
    events: SecureEvent[];
    deviceFingerprint: string;
    batchId: string;
    sentAt: string;
}

/** Ghost Template — output of pattern detection (PRD §3.3) */
export interface GhostTemplate {
    id: string;
    name: string;
    description: string;
    trigger: {
        type: 'event' | 'schedule' | 'api';
        condition: string;
    };
    parameters: GhostParameter[];
    executionPlan: ExecutionNode[];
    confidence: number;
    usageStats: {
        observedCount: number;
        userCount: number;
        avgExecutionTime: number;
    };
}

export interface GhostParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
    defaultValue?: unknown;
}

/** Execution plan node — DAG of actions (PRD §3.4) */
export interface ExecutionNode {
    id: string;
    type: 'action' | 'condition' | 'loop' | 'parallel';
    action?: {
        tool: string;
        params: Record<string, unknown>;
    };
    condition?: string;
    children?: string[];
    fallback?: string;
    timeout?: number;
}

/** Execution result */
export interface ExecutionResult {
    executionId: string;
    ghostId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    steps: StepResult[];
    startedAt: string;
    completedAt?: string;
    error?: string;
}

export interface StepResult {
    nodeId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    strategy: string;
    durationMs: number;
    output?: unknown;
    error?: string;
}

/** Pattern detection result */
export interface DetectedPattern {
    id: string;
    orgId: string;
    intentSequence: string[];
    structuralHashes: string[];
    occurrences: number;
    confidence: number;
    suggestedName?: string;
    suggestedDescription?: string;
    firstSeen: string;
    lastSeen: string;
}

/** API response envelope */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    meta?: {
        requestId: string;
        timestamp: string;
    };
}
