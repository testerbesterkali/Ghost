/**
 * pattern-detector — Temporal Intent Clustering (TIC) for workflow discovery.
 * PRD §3.3 Layer 2: Pattern Intelligence.
 *
 * Steps:
 *   1. Sequence Embedding (sliding window of intent vectors)
 *   2. Online Clustering (density-based, temporal constraints)
 *   3. Abstraction Lifting (LLM-based generalization)
 *   4. Confidence Scoring (statistical + semantic)
 *
 * Output: Candidate Ghosts (parameterized workflow templates)
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDefaultProvider } from '../_shared/llm/factory.ts';
import type {
    SecureEvent,
    DetectedPattern,
    GhostTemplate,
    ApiResponse,
} from '../_shared/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** PRD §3.3: Sliding window of last 50 events */
const WINDOW_SIZE = 50;
/** PRD §3.3: Minimum cluster size: 3 occurrences */
const MIN_CLUSTER_SIZE = 3;
/** PRD §3.3: Events in same cluster within 30-minute windows */
const TEMPORAL_WINDOW_MS = 30 * 60 * 1000;
/** PRD §3.3: 0.85 confidence for auto-suggestion */
const AUTO_SUGGEST_THRESHOLD = 0.85;
/** PRD §3.3: 0.70 for manual review */
const REVIEW_THRESHOLD = 0.70;

serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const requestId = crypto.randomUUID();

    try {
        const { orgId, batchId, trigger } = await req.json();

        if (!orgId) {
            return jsonResponse<ApiResponse>(
                { success: false, error: { code: 'MISSING_ORG', message: 'orgId required' } },
                400,
                corsHeaders,
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Step 1: Fetch recent events for this org (sliding window)
        const { data: recentEvents, error: fetchError } = await supabase
            .from('secure_events')
            .select('*')
            .eq('org_id', orgId)
            .order('ingested_at', { ascending: false })
            .limit(WINDOW_SIZE * 5); // Fetch enough for multiple windows

        if (fetchError) {
            throw new Error(`Fetch error: ${fetchError.message}`);
        }

        if (!recentEvents || recentEvents.length < MIN_CLUSTER_SIZE) {
            return jsonResponse<ApiResponse>(
                {
                    success: true,
                    data: { patterns: [], message: 'Insufficient data for pattern detection' },
                    meta: { requestId, timestamp: new Date().toISOString() },
                },
                200,
                corsHeaders,
            );
        }

        // Step 2: Sequence embedding + clustering
        const events = recentEvents.map(rowToSecureEvent);
        const sequences = extractSequences(events, WINDOW_SIZE);
        console.log(`[pattern-detector] Extracted ${sequences.length} sequences from ${events.length} events`);

        const clusters = clusterSequences(sequences);
        console.log(`[pattern-detector] Formed ${clusters.length} initial clusters`);

        // Step 3: Filter clusters by minimum size and temporal constraint
        const validClusters = clusters.filter(
            (c) => c.members.length >= MIN_CLUSTER_SIZE,
        );
        console.log(`[pattern-detector] Found ${validClusters.length} valid clusters (>= ${MIN_CLUSTER_SIZE} members)`);

        if (validClusters.length === 0) {
            console.log('[pattern-detector] No significant patterns found. Similarity stats:', clusters.length > 0 ? 'centroids exist' : 'no clusters');
            return jsonResponse<ApiResponse>(
                {
                    success: true,
                    data: { patterns: [], message: 'No significant patterns found' },
                    meta: { requestId, timestamp: new Date().toISOString() },
                },
                200,
                corsHeaders,
            );
        }

        // Step 4: Abstraction lifting via LLM
        const llm = getDefaultProvider();
        const patterns: DetectedPattern[] = [];

        for (const cluster of validClusters.slice(0, 5)) {
            // Take up to 5 representative instances
            try {
                const pattern = await abstractCluster(cluster, llm, orgId);
                if (pattern && pattern.confidence >= REVIEW_THRESHOLD) {
                    patterns.push(pattern);

                    // Store detected pattern
                    await supabase.from('detected_patterns').upsert({
                        id: pattern.id,
                        org_id: orgId,
                        intent_sequence: pattern.intentSequence,
                        structural_hashes: pattern.structuralHashes,
                        occurrences: pattern.occurrences,
                        confidence: pattern.confidence,
                        suggested_name: pattern.suggestedName,
                        suggested_description: pattern.suggestedDescription,
                        first_seen: pattern.firstSeen,
                        last_seen: pattern.lastSeen,
                        status:
                            pattern.confidence >= AUTO_SUGGEST_THRESHOLD
                                ? 'auto_suggested'
                                : 'needs_review',
                    });
                }
            } catch (err) {
                console.error('[pattern-detector] Abstraction error:', err);
            }
        }

        return jsonResponse<ApiResponse>(
            {
                success: true,
                data: {
                    patternsFound: patterns.length,
                    patterns: patterns.map((p) => ({
                        id: p.id,
                        name: p.suggestedName,
                        confidence: p.confidence,
                        occurrences: p.occurrences,
                    })),
                },
                meta: { requestId, timestamp: new Date().toISOString() },
            },
            200,
            corsHeaders,
        );
    } catch (error) {
        console.error('[pattern-detector] Error:', error);
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

// --- Pattern Detection Algorithms ---

interface EventSequence {
    events: SecureEvent[];
    embedding: number[];
    timestamp: string;
}

interface Cluster {
    centroid: number[];
    members: EventSequence[];
    intentLabels: string[];
}

/**
 * Step 1: Extract sliding windows of intent vectors.
 * PRD §3.3: Sliding window of last 50 events.
 */
function extractSequences(
    events: SecureEvent[],
    windowSize: number,
): EventSequence[] {
    const sequences: EventSequence[] = [];

    // Group by session
    const sessions = new Map<string, SecureEvent[]>();
    for (const event of events) {
        const key = event.sessionFingerprint;
        if (!sessions.has(key)) sessions.set(key, []);
        sessions.get(key)!.push(event);
    }

    // Create sliding windows within each session
    for (const [, sessionEvents] of sessions) {
        const sorted = sessionEvents.sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber,
        );

        for (let i = 0; i <= Math.max(0, sorted.length - 3); i++) {
            const window = sorted.slice(i, Math.min(i + windowSize, sorted.length));
            if (window.length < 3) continue;

            // Create sequence embedding by averaging intent vectors
            const embedding = averageVectors(
                window.map((e) => e.intentVector).filter((v) => v && v.length > 0),
            );

            sequences.push({
                events: window,
                embedding,
                timestamp: window[0].timestampBucket,
            });
        }
    }

    return sequences;
}

/**
 * Step 2: Density-based clustering in embedding space.
 * Simplified HDBSCAN: uses cosine similarity threshold.
 */
function clusterSequences(sequences: EventSequence[]): Cluster[] {
    if (sequences.length === 0) return [];

    const SIMILARITY_THRESHOLD = 0.75;
    const assigned = new Set<number>();
    const clusters: Cluster[] = [];

    for (let i = 0; i < sequences.length; i++) {
        if (assigned.has(i)) continue;

        const cluster: Cluster = {
            centroid: sequences[i].embedding,
            members: [sequences[i]],
            intentLabels: sequences[i].events.map((e) => e.intentLabel),
        };
        assigned.add(i);

        for (let j = i + 1; j < sequences.length; j++) {
            if (assigned.has(j)) continue;

            const similarity = cosineSimilarity(
                sequences[i].embedding,
                sequences[j].embedding,
            );

            // Also check temporal constraint (30-minute window)
            const timeDiffMs =
                Math.abs(
                    new Date(sequences[i].timestamp).getTime() -
                    new Date(sequences[j].timestamp).getTime(),
                );

            if (similarity >= SIMILARITY_THRESHOLD && timeDiffMs <= TEMPORAL_WINDOW_MS) {
                cluster.members.push(sequences[j]);
                cluster.intentLabels.push(
                    ...sequences[j].events.map((e) => e.intentLabel),
                );
                assigned.add(j);
            }
        }

        // Update centroid
        cluster.centroid = averageVectors(
            cluster.members.map((m) => m.embedding),
        );

        clusters.push(cluster);
    }

    return clusters;
}

/**
 * Step 3: LLM-based generalization of a cluster.
 * PRD §3.3: Takes 5-10 concrete instances, produces a workflow template.
 */
async function abstractCluster(
    cluster: Cluster,
    llm: ReturnType<typeof getDefaultProvider>,
    orgId: string,
): Promise<DetectedPattern | null> {
    // Prepare representative instances for the LLM
    const instances = cluster.members
        .slice(0, 5)
        .map((member, idx) => {
            const intentFlow = member.events
                .map((e) => {
                    const meta = e.metadata ? ` [Context: ${JSON.stringify(e.metadata)}]` : '';
                    return `${e.intentLabel} (${e.eventType})${meta}`;
                })
                .join(' → ');
            return `Instance ${idx + 1}: ${intentFlow}`;
        });

    const response = await llm.complete({
        messages: [
            {
                role: 'system',
                content: `You are a workflow pattern analyzer. Given sequences of user intent signals and their metadata (URLs, page titles, app names), identify the underlying workflow and generalize it into a highly specific, goal-oriented reusable template. 

CRITICAL: Avoid generic names like "Navigation", "Data Entry", or "Workflow". Instead, use site-specific or task-specific names like "LinkedIn Job Application", "Jira Issue Creation", "Salesforce Lead Update", or "Email Draft Composition".

Respond in JSON format with these fields: name (string), description (string), confidence (0-1), trigger (string), parameters (array of {name, type, description}).`,
            },
            {
                role: 'user',
                content: `Analyze these user interaction sequences (with metadata) and identify the specific workflow pattern:

${instances.join('\n')}

Intent distribution: ${summarizeIntents(cluster.intentLabels)}

Generalize to a specific, descriptive workflow template. Return JSON only.`,
            },
        ],
        temperature: 0.3,
        maxTokens: 1000,
    });

    if (!response.content) return null;

    try {
        // Extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        // Compute statistical confidence
        const statisticalConfidence = computeStatisticalConfidence(cluster);
        const semanticConfidence = parsed.confidence || 0.5;
        const combinedConfidence = statisticalConfidence * 0.6 + semanticConfidence * 0.4;

        return {
            id: crypto.randomUUID(),
            orgId,
            intentSequence: [
                ...new Set(cluster.members.flatMap((m) => m.events.map((e) => e.intentLabel))),
            ],
            structuralHashes: [
                ...new Set(
                    cluster.members.flatMap((m) => m.events.map((e) => e.structuralHash)),
                ),
            ],
            occurrences: cluster.members.length,
            confidence: Math.round(combinedConfidence * 100) / 100,
            suggestedName: parsed.name || 'Unnamed Pattern',
            suggestedDescription: parsed.description || '',
            firstSeen: cluster.members[cluster.members.length - 1]?.timestamp ||
                new Date().toISOString(),
            lastSeen: cluster.members[0]?.timestamp || new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

/**
 * Step 4: Statistical confidence scoring.
 * PRD §3.3: Variance in execution time, success rate.
 */
function computeStatisticalConfidence(cluster: Cluster): number {
    const n = cluster.members.length;
    if (n < MIN_CLUSTER_SIZE) return 0;

    // Factor 1: Number of occurrences (more = higher confidence)
    const occurrenceScore = Math.min(n / 10, 1);

    // Factor 2: Consistency of intent sequences
    const intentSets = cluster.members.map(
        (m) => m.events.map((e) => e.intentLabel).join(','),
    );
    const uniquePatterns = new Set(intentSets).size;
    const consistencyScore = 1 - (uniquePatterns - 1) / Math.max(n, 1);

    // Factor 3: Average intent confidence
    const avgConfidence =
        cluster.members.flatMap((m) => m.events.map((e) => e.intentConfidence))
            .reduce((a, b) => a + b, 0) /
        cluster.members.flatMap((m) => m.events).length;

    return (
        occurrenceScore * 0.3 +
        consistencyScore * 0.4 +
        avgConfidence * 0.3
    );
}

// --- Utility Functions ---

function averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const avg = new Array(dim).fill(0);
    for (const vec of vectors) {
        for (let i = 0; i < dim; i++) {
            avg[i] += (vec[i] || 0) / vectors.length;
        }
    }
    return avg;
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

function summarizeIntents(labels: string[]): string {
    const counts = new Map<string, number>();
    for (const label of labels) {
        counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => `${label}: ${count}`)
        .join(', ');
}

function rowToSecureEvent(row: any): SecureEvent {
    return {
        sessionFingerprint: row.session_fingerprint,
        timestampBucket: row.timestamp_bucket,
        intentVector: row.intent_vector || [],
        structuralHash: row.structural_hash,
        orgId: row.org_id,
        eventType: row.event_type,
        intentLabel: row.intent_label,
        intentConfidence: row.intent_confidence,
        elementSignature: row.element_signature,
        sequenceNumber: row.sequence_number,
        metadata: row.metadata || {},
    };
}

function jsonResponse<T>(
    body: T,
    status: number,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}
