/**
 * LLM Provider Factory — Instantiates the configured LLM provider.
 * Defaults to OpenAI GPT-4o. Set LLM_PROVIDER env var to switch.
 */

import { LLMProvider } from './interface.ts';
import { OpenAIAdapter } from './openai-adapter.ts';

export type ProviderName = 'openai' | 'llama' | 'anthropic';

/**
 * Create an LLM provider instance based on environment configuration.
 * PRD §3.4: GPT-4o default, Llama 3 70B swap-ready.
 */
export function createLLMProvider(
    providerOverride?: ProviderName,
): LLMProvider {
    const provider =
        providerOverride ||
        (Deno.env.get('LLM_PROVIDER') as ProviderName) ||
        'openai';

    switch (provider) {
        case 'openai':
            return new OpenAIAdapter({
                apiKey: Deno.env.get('OPENAI_API_KEY') || '',
                model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o',
            });

        case 'llama':
            // Llama adapter uses OpenAI-compatible API (vLLM, Ollama, etc.)
            return new OpenAIAdapter({
                apiKey: Deno.env.get('LLAMA_API_KEY') || 'not-needed',
                model: Deno.env.get('LLAMA_MODEL') || 'meta-llama/Llama-3-70b-chat-hf',
                baseUrl:
                    Deno.env.get('LLAMA_BASE_URL') || 'http://localhost:8000/v1',
            });

        case 'anthropic':
            // Placeholder for future Anthropic adapter
            throw new Error(
                'Anthropic adapter not yet implemented. Use openai or llama.',
            );

        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

/**
 * Get the default LLM provider (singleton per edge function invocation).
 */
let _defaultProvider: LLMProvider | null = null;

export function getDefaultProvider(): LLMProvider {
    if (!_defaultProvider) {
        _defaultProvider = createLLMProvider();
    }
    return _defaultProvider;
}
