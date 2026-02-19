/**
 * OpenAI Adapter — GPT-4o with function calling.
 * PRD §3.4: Planner uses GPT-4o with function calling.
 * API key via environment variable OPENAI_API_KEY.
 */

import {
    LLMProvider,
    LLMCompletionRequest,
    LLMCompletionResponse,
    LLMToolCall,
} from './interface.ts';

interface OpenAIConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
    organizationId?: string;
    timeout: number;
}

const DEFAULT_CONFIG: OpenAIConfig = {
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    timeout: 30000,
};

export class OpenAIAdapter implements LLMProvider {
    readonly name = 'openai';
    private config: OpenAIConfig;

    constructor(config: Partial<OpenAIConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            apiKey: config.apiKey || Deno.env.get('OPENAI_API_KEY') || '',
        };

        if (!this.config.apiKey) {
            console.warn('[OpenAI] No API key configured. Set OPENAI_API_KEY env var.');
        }
    }

    async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
        const startTime = Date.now();

        const body: Record<string, unknown> = {
            model: this.config.model,
            messages: request.messages.map((m) => this.formatMessage(m)),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
        };

        // Add tools if provided
        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));

            if (request.toolChoice) {
                body.tool_choice = request.toolChoice;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    ...(this.config.organizationId
                        ? { 'OpenAI-Organization': this.config.organizationId }
                        : {}),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(
                    `OpenAI API error ${response.status}: ${error}`,
                );
            }

            const data = await response.json();
            const choice = data.choices?.[0];
            const latencyMs = Date.now() - startTime;

            // Extract tool calls
            const toolCalls: LLMToolCall[] =
                choice?.message?.tool_calls?.map(
                    (tc: any): LLMToolCall => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments,
                        },
                    }),
                ) || [];

            return {
                id: data.id,
                content: choice?.message?.content || null,
                toolCalls,
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                },
                finishReason: this.mapFinishReason(choice?.finish_reason),
                model: data.model || this.config.model,
                latencyMs,
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/models`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private formatMessage(
        message: LLMCompletionRequest['messages'][0],
    ): Record<string, unknown> {
        const formatted: Record<string, unknown> = {
            role: message.role,
            content: message.content,
        };

        if (message.name) formatted.name = message.name;
        if (message.tool_call_id) formatted.tool_call_id = message.tool_call_id;
        if (message.tool_calls) formatted.tool_calls = message.tool_calls;

        return formatted;
    }

    private mapFinishReason(
        reason: string,
    ): LLMCompletionResponse['finishReason'] {
        switch (reason) {
            case 'stop':
                return 'stop';
            case 'tool_calls':
                return 'tool_calls';
            case 'length':
                return 'length';
            case 'content_filter':
                return 'content_filter';
            default:
                return 'stop';
        }
    }
}
