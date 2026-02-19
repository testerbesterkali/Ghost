/**
 * ingest-events — Receives SecureEvent batches from browser extension.
 * PRD §7.1: POST /v1/sessions/batch
 *   - Body: Array of SecureEvent (max 100/batch)
 *   - Response: 202 Accepted, processed async
 *   - Rate limit: 1000 events/minute per device
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SecureEventBatch, ApiResponse } from '../_shared/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_BATCH_SIZE = 100;
const RATE_LIMIT_PER_MINUTE = 1000;

// In-memory rate limiting (per-device)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
            'authorization, x-ghost-batch-id, x-ghost-device, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse<ApiResponse>(
            { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } },
            405,
            corsHeaders,
        );
    }

    const requestId = crypto.randomUUID();

    try {
        // Parse batch
        const batch: SecureEventBatch = await req.json();

        // Validate batch
        if (!batch.events || !Array.isArray(batch.events)) {
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: { code: 'INVALID_BATCH', message: 'events array required' },
                },
                400,
                corsHeaders,
            );
        }

        if (batch.events.length > MAX_BATCH_SIZE) {
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: {
                        code: 'BATCH_TOO_LARGE',
                        message: `Max ${MAX_BATCH_SIZE} events per batch`,
                    },
                },
                400,
                corsHeaders,
            );
        }

        // Rate limiting per device
        const deviceId =
            req.headers.get('x-ghost-device') || batch.deviceFingerprint || 'unknown';
        if (!checkRateLimit(deviceId)) {
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Max ${RATE_LIMIT_PER_MINUTE} events/minute`,
                    },
                },
                429,
                { ...corsHeaders, 'Retry-After': '60' },
            );
        }

        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Insert events into secure_events table
        const rows = batch.events.map((event) => ({
            session_fingerprint: event.sessionFingerprint,
            timestamp_bucket: event.timestampBucket,
            intent_vector: event.intentVector,
            structural_hash: event.structuralHash,
            org_id: event.orgId,
            event_type: event.eventType,
            intent_label: event.intentLabel,
            intent_confidence: event.intentConfidence,
            element_signature: event.elementSignature,
            sequence_number: event.sequenceNumber,
            device_fingerprint: deviceId,
            batch_id: batch.batchId,
            ingested_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
            .from('secure_events')
            .insert(rows);

        if (insertError) {
            console.error('[ingest-events] Insert error:', insertError);
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: {
                        code: 'INSERT_FAILED',
                        message: insertError.message,
                    },
                },
                500,
                corsHeaders,
            );
        }

        // Async: Trigger pattern detection (fire-and-forget)
        const orgIds = [...new Set(batch.events.map((e) => e.orgId))];
        for (const orgId of orgIds) {
            triggerPatternDetection(orgId, batch.batchId).catch((err) =>
                console.error('[ingest-events] Pattern trigger error:', err),
            );
        }

        return jsonResponse<ApiResponse>(
            {
                success: true,
                data: {
                    accepted: batch.events.length,
                    batchId: batch.batchId,
                },
                meta: { requestId, timestamp: new Date().toISOString() },
            },
            202,
            corsHeaders,
        );
    } catch (error) {
        console.error('[ingest-events] Error:', error);
        return jsonResponse<ApiResponse>(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
                meta: { requestId, timestamp: new Date().toISOString() },
            },
            500,
            corsHeaders,
        );
    }
});

/**
 * Check + update rate limit for a device.
 */
function checkRateLimit(deviceId: string): boolean {
    const now = Date.now();
    const entry = rateLimits.get(deviceId);

    if (!entry || now >= entry.resetAt) {
        rateLimits.set(deviceId, { count: 1, resetAt: now + 60000 });
        return true;
    }

    if (entry.count >= RATE_LIMIT_PER_MINUTE) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * Fire-and-forget trigger to pattern-detector edge function.
 */
async function triggerPatternDetection(
    orgId: string,
    batchId: string,
): Promise<void> {
    const PATTERN_DETECTOR_URL = `${SUPABASE_URL}/functions/v1/pattern-detector`;

    await fetch(PATTERN_DETECTOR_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ orgId, batchId, trigger: 'ingest' }),
    });
}

/**
 * Helper: JSON response with proper headers.
 */
function jsonResponse<T>(
    body: T,
    status: number,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}
