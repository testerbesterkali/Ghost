/**
 * SecureEvent — Output of the privacy pipeline, transmitted to cloud.
 * PRD §3.2 Layer 1: Privacy-Computing Edge.
 * NO raw text, NO URLs, NO screenshots leave the device.
 */

export interface SecureEvent {
    /** HMAC of device+user+time (irreversible) */
    sessionFingerprint: string;
    /** 5-minute granularity only */
    timestampBucket: string;
    /** Encoded action semantics (128-dim intent vector) */
    intentVector: number[];
    /** DOM structure fingerprint (no content) */
    structuralHash: string;
    /** For routing only */
    orgId: string;
    /** Event classification */
    eventType: 'dom_mut' | 'user_int' | 'network' | 'error';
    /** Intent label from classifier */
    intentLabel: string;
    /** Confidence score of intent classification */
    intentConfidence: number;
    /** Anonymized element fingerprint (ARIA role + DOM path only, no text) */
    elementSignature: string | null;
    /** Sequence number within session for ordering */
    sequenceNumber: number;
}

/**
 * Batch payload sent to Supabase ingest-events edge function.
 * PRD §7.1: POST /v1/sessions/batch — max 100/batch.
 */
export interface SecureEventBatch {
    events: SecureEvent[];
    deviceFingerprint: string;
    batchId: string;
    sentAt: string;
}
