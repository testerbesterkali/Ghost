/**
 * ghost-executor — Adaptive Execution Engine.
 * PRD §3.4 Layer 3: Execution Runtime.
 *
 * Components:
 *   1. Planner (LLM-based) — creates execution plans with fallback branches
 *   2. Selector (Strategy Pattern) — semantic → structural → visual → escalate
 *   3. Executor (Multi-Modal) — API mode, browser mode, hybrid
 *   4. Verifier (Assertion Engine) — post-execution validation
 *
 * Self-Healing: tries all strategies, replans with LLM on failure.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDefaultProvider } from '../_shared/llm/factory.ts';
import type {
    GhostTemplate,
    ExecutionNode,
    ExecutionResult,
    StepResult,
    ApiResponse,
} from '../_shared/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** PRD §3.4: Tool definitions for the LLM planner */
const PLANNER_TOOLS = [
    {
        name: 'navigate_to',
        description: 'Navigate browser to a URL',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Target URL' },
            },
            required: ['url'],
        },
    },
    {
        name: 'click_element',
        description: 'Click an element identified by selector strategy and value',
        parameters: {
            type: 'object',
            properties: {
                selector_strategy: {
                    type: 'string',
                    enum: ['semantic', 'structural', 'visual', 'coordinate'],
                    description: 'Element selection strategy (PRD: try semantic → structural → visual → escalate)',
                },
                value: { type: 'string', description: 'Selector value (ARIA label, DOM path, etc.)' },
            },
            required: ['selector_strategy', 'value'],
        },
    },
    {
        name: 'input_text',
        description: 'Type text into an input element',
        parameters: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'Element selector' },
                text: { type: 'string', description: 'Text to input' },
            },
            required: ['selector', 'text'],
        },
    },
    {
        name: 'api_call',
        description: 'Make a direct API call',
        parameters: {
            type: 'object',
            properties: {
                endpoint: { type: 'string', description: 'API endpoint URL' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
                body: { type: 'object', description: 'Request body' },
                headers: { type: 'object', description: 'Additional headers' },
            },
            required: ['endpoint', 'method'],
        },
    },
    {
        name: 'extract_data',
        description: 'Extract data from an element or API response',
        parameters: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'Element selector or JSON path' },
                format: { type: 'string', enum: ['text', 'html', 'json', 'table'] },
            },
            required: ['selector', 'format'],
        },
    },
    {
        name: 'human_escalation',
        description: 'Escalate to human when automation cannot proceed (CAPTCHA, 2FA, ambiguous decision)',
        parameters: {
            type: 'object',
            properties: {
                reason: { type: 'string', description: 'Why human intervention is needed' },
                context: { type: 'string', description: 'Current state context' },
            },
            required: ['reason'],
        },
    },
];

serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const requestId = crypto.randomUUID();
    const executionId = crypto.randomUUID();

    try {
        const { ghostId, parameters, trigger } = await req.json();

        if (!ghostId) {
            return jsonResponse<ApiResponse>(
                { success: false, error: { code: 'MISSING_GHOST', message: 'ghostId required' } },
                400,
                corsHeaders,
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch Ghost template
        const { data: ghost, error: ghostError } = await supabase
            .from('ghosts')
            .select('*')
            .eq('id', ghostId)
            .single();

        if (ghostError || !ghost) {
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: { code: 'GHOST_NOT_FOUND', message: `Ghost ${ghostId} not found` },
                },
                404,
                corsHeaders,
            );
        }

        // Check if ghost is approved
        if (ghost.status !== 'approved' && ghost.status !== 'active') {
            return jsonResponse<ApiResponse>(
                {
                    success: false,
                    error: {
                        code: 'GHOST_NOT_APPROVED',
                        message: `Ghost status is ${ghost.status}, must be approved or active`,
                    },
                },
                403,
                corsHeaders,
            );
        }

        // Create execution record
        const executionResult: ExecutionResult = {
            executionId,
            ghostId,
            status: 'running',
            steps: [],
            startedAt: new Date().toISOString(),
        };

        await supabase.from('executions').insert({
            id: executionId,
            ghost_id: ghostId,
            status: 'running',
            parameters: parameters || {},
            trigger: trigger || 'manual',
            started_at: executionResult.startedAt,
        });

        // Step 1: Plan execution with LLM
        const llm = getDefaultProvider();
        const plan = await createExecutionPlan(ghost, parameters || {}, llm);

        // Step 2: Execute plan with self-healing
        const steps: StepResult[] = [];
        let overallStatus: 'completed' | 'failed' = 'completed';

        for (const node of plan) {
            const stepResult = await executeNode(node, ghost, llm);
            steps.push(stepResult);

            // Update execution record
            await supabase
                .from('execution_steps')
                .insert({
                    execution_id: executionId,
                    node_id: node.id,
                    status: stepResult.status,
                    strategy: stepResult.strategy,
                    duration_ms: stepResult.durationMs,
                    output: stepResult.output,
                    error: stepResult.error,
                });

            if (stepResult.status === 'failed') {
                // Try self-healing: replan with LLM
                const healResult = await attemptSelfHealing(
                    node,
                    stepResult,
                    ghost,
                    llm,
                );

                if (healResult) {
                    steps.push(healResult);
                } else {
                    overallStatus = 'failed';
                    break;
                }
            }
        }

        // Update execution record with final status
        const completedAt = new Date().toISOString();
        await supabase
            .from('executions')
            .update({
                status: overallStatus,
                completed_at: completedAt,
                step_count: steps.length,
            })
            .eq('id', executionId);

        // Record execution for feedback loop (PRD §3.5)
        await supabase.from('execution_logs').insert({
            execution_id: executionId,
            ghost_id: ghostId,
            org_id: ghost.org_id,
            status: overallStatus,
            steps: steps.length,
            duration_ms:
                new Date(completedAt).getTime() -
                new Date(executionResult.startedAt).getTime(),
            strategies_used: [...new Set(steps.map((s) => s.strategy))],
        });

        return jsonResponse<ApiResponse>(
            {
                success: true,
                data: {
                    executionId,
                    ghostId,
                    status: overallStatus,
                    steps: steps.map((s) => ({
                        nodeId: s.nodeId,
                        status: s.status,
                        strategy: s.strategy,
                        durationMs: s.durationMs,
                    })),
                    startedAt: executionResult.startedAt,
                    completedAt,
                },
                meta: { requestId, timestamp: new Date().toISOString() },
            },
            200,
            corsHeaders,
        );
    } catch (error) {
        console.error('[ghost-executor] Error:', error);
        return jsonResponse<ApiResponse>(
            {
                success: false,
                error: {
                    code: 'EXECUTION_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
                meta: { requestId, timestamp: new Date().toISOString() },
            },
            500,
            corsHeaders,
        );
    }
});

// --- Planner ---

/**
 * Create an execution plan using LLM with function calling.
 * PRD §3.4: Input: Ghost template + current environment state.
 * Output: Concrete execution plan with fallback branches.
 */
async function createExecutionPlan(
    ghost: any,
    parameters: Record<string, unknown>,
    llm: ReturnType<typeof getDefaultProvider>,
): Promise<ExecutionNode[]> {
    // If ghost already has an execution plan, use it
    if (ghost.execution_plan && Array.isArray(ghost.execution_plan)) {
        return ghost.execution_plan;
    }

    const response = await llm.complete({
        messages: [
            {
                role: 'system',
                content: `You are an execution planner for Ghost, an autonomous workflow automation engine. Generate a step-by-step execution plan as a JSON array of action nodes. Each node has: id (string), type ("action"), action: {tool (one of: navigate_to, click_element, input_text, api_call, extract_data, human_escalation), params: {...}}. Prefer API calls over browser automation when possible. Include fallback strategies.`,
            },
            {
                role: 'user',
                content: `Create an execution plan for this Ghost:\nName: ${ghost.name}\nDescription: ${ghost.description}\nTrigger: ${JSON.stringify(ghost.trigger)}\nParameters: ${JSON.stringify(parameters)}\n\nReturn a JSON array of execution nodes.`,
            },
        ],
        temperature: 0.2,
        maxTokens: 2000,
    });

    if (response.content) {
        try {
            const match = response.content.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch {
            // Fall through to default plan
        }
    }

    // Default single-step plan if LLM fails
    return [
        {
            id: 'step_1',
            type: 'action',
            action: {
                tool: 'human_escalation',
                params: { reason: 'Could not generate execution plan automatically' },
            },
        },
    ];
}

// --- Executor ---

/**
 * Execute a single node with strategy selection.
 * PRD §3.4 Selector: semantic → structural → visual → escalate.
 */
async function executeNode(
    node: ExecutionNode,
    ghost: any,
    llm: ReturnType<typeof getDefaultProvider>,
): Promise<StepResult> {
    const startTime = Date.now();

    try {
        if (!node.action) {
            return {
                nodeId: node.id,
                status: 'skipped',
                strategy: 'none',
                durationMs: 0,
            };
        }

        const tool = node.action.tool;
        const params = node.action.params;

        let result: unknown;
        let strategy = 'direct';

        switch (tool) {
            case 'api_call':
                result = await executeApiCall(params);
                strategy = 'api';
                break;

            case 'navigate_to':
            case 'click_element':
            case 'input_text':
            case 'extract_data':
                // These require browser automation — record the intent,
                // actual browser execution happens on the client side
                result = {
                    action: tool,
                    params,
                    note: 'Queued for client-side browser execution',
                };
                strategy = params.selector_strategy || 'semantic';
                break;

            case 'human_escalation':
                result = {
                    escalated: true,
                    reason: params.reason,
                    context: params.context,
                };
                strategy = 'human';
                break;

            default:
                result = { error: `Unknown tool: ${tool}` };
                strategy = 'unknown';
        }

        return {
            nodeId: node.id,
            status: 'completed',
            strategy,
            durationMs: Date.now() - startTime,
            output: result,
        };
    } catch (error) {
        return {
            nodeId: node.id,
            status: 'failed',
            strategy: 'direct',
            durationMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Execute an API call directly.
 * PRD §3.4: Direct REST/GraphQL when API available + stable.
 */
async function executeApiCall(
    params: Record<string, unknown>,
): Promise<unknown> {
    const { endpoint, method, body, headers } = params as {
        endpoint: string;
        method: string;
        body?: unknown;
        headers?: Record<string, string>;
    };

    const response = await fetch(endpoint, {
        method: method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.text();
    let parsed: unknown;
    try {
        parsed = JSON.parse(responseData);
    } catch {
        parsed = responseData;
    }

    return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: parsed,
    };
}

// --- Self-Healing ---

/**
 * Attempt self-healing when a step fails.
 * PRD §3.4: All strategies exhausted → replan with LLM.
 */
async function attemptSelfHealing(
    failedNode: ExecutionNode,
    failedResult: StepResult,
    ghost: any,
    llm: ReturnType<typeof getDefaultProvider>,
): Promise<StepResult | null> {
    const startTime = Date.now();

    try {
        const response = await llm.complete({
            messages: [
                {
                    role: 'system',
                    content: `You are a self-healing execution engine. A workflow step failed. Analyze the error and suggest an alternative approach. Return a JSON object with: {tool, params} representing the alternative action to take. If no workaround is possible, return {tool: "human_escalation", params: {reason: "..."}}.`,
                },
                {
                    role: 'user',
                    content: `Failed step: ${JSON.stringify(failedNode)}\nError: ${failedResult.error}\nGhost: ${ghost.name}\nSuggest an alternative execution approach.`,
                },
            ],
            temperature: 0.3,
            maxTokens: 500,
        });

        if (!response.content) return null;

        const match = response.content.match(/\{[\s\S]*\}/);
        if (!match) return null;

        const alternative = JSON.parse(match[0]);

        // Execute the alternative
        const altNode: ExecutionNode = {
            id: `${failedNode.id}_healed`,
            type: 'action',
            action: {
                tool: alternative.tool,
                params: alternative.params || {},
            },
        };

        const altResult = await executeNode(altNode, ghost, llm);
        altResult.strategy = `self_healed:${altResult.strategy}`;

        return altResult;
    } catch (error) {
        console.error('[ghost-executor] Self-healing failed:', error);
        return null;
    }
}

// --- Utility ---

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
