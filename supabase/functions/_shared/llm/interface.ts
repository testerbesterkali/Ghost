/**
 * LLM Provider Interface — Port/Adapter pattern for provider-agnostic LLM access.
 * PRD §3.4: GPT-4o with function calling. Llama 3 70B swap-ready.
 */

/** Tool/function that the LLM can call */
export interface LLMTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

/** A single message in the conversation */
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: LLMToolCall[];
}

/** A tool call returned by the LLM */
export interface LLMToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/** LLM completion request */
export interface LLMCompletionRequest {
    messages: LLMMessage[];
    tools?: LLMTool[];
    temperature?: number;
    maxTokens?: number;
    /** Force a specific tool call */
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/** LLM completion response */
export interface LLMCompletionResponse {
    id: string;
    content: string | null;
    toolCalls: LLMToolCall[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
    model: string;
    latencyMs: number;
}

/**
 * The Port — provider-agnostic LLM interface.
 * Implement this for each provider (OpenAI, Llama, Anthropic, etc.)
 */
export interface LLMProvider {
    /** Provider name for logging */
    readonly name: string;
    /** Complete a conversation with optional function calling */
    complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
    /** Check if the provider is available */
    healthCheck(): Promise<boolean>;
}
