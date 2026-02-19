/**
 * IntentEncoder — Classifies user actions into intent categories.
 * PRD §3.2 Layer 1: TinyBERT-equivalent for browser context.
 * Produces 128-dim intent vectors + confidence scores.
 *
 * Architecture: Rule-based classifier with interface ready for ML model upgrade.
 * When ONNX runtime is loaded, this will delegate to the on-device model.
 */

import { RawEvent } from '../types/raw-event';

/** Intent classification result */
export interface IntentResult {
    /** Primary intent label */
    label: string;
    /** Confidence score 0-1 */
    confidence: number;
    /** 128-dimensional intent vector */
    vector: number[];
}

/** Canonical intent classes from PRD §3.2 */
export type IntentClass =
    | 'data_entry'
    | 'navigation'
    | 'communication'
    | 'research'
    | 'approval'
    | 'file_operation'
    | 'authentication'
    | 'configuration'
    | 'data_extraction'
    | 'workflow_transition'
    | 'error_handling'
    | 'unknown';

/** Mapping of intent class to a stable seed for vector generation */
const INTENT_SEEDS: Record<IntentClass, number> = {
    data_entry: 0x1a2b3c4d,
    navigation: 0x2b3c4d5e,
    communication: 0x3c4d5e6f,
    research: 0x4d5e6f70,
    approval: 0x5e6f7081,
    file_operation: 0x6f708192,
    authentication: 0x708192a3,
    configuration: 0x8192a3b4,
    data_extraction: 0x92a3b4c5,
    workflow_transition: 0xa3b4c5d6,
    error_handling: 0xb4c5d6e7,
    unknown: 0xc5d6e7f8,
};

export class IntentEncoder {
    /**
     * Encode a RawEvent into an intent classification.
     * Rule-based classification using event metadata (no raw content needed).
     */
    encode(event: RawEvent): IntentResult {
        const { label, confidence } = this.classify(event);
        const vector = this.generateVector(label, event);
        return { label, confidence, vector };
    }

    /**
     * Classify the intent of a RawEvent.
     */
    private classify(event: RawEvent): { label: IntentClass; confidence: number } {
        switch (event.eventType) {
            case 'user_int':
                return this.classifyUserInteraction(event);
            case 'dom_mut':
                return this.classifyDomMutation(event);
            case 'network':
                return this.classifyNetworkEvent(event);
            case 'error':
                return { label: 'error_handling', confidence: 0.9 };
            default:
                return { label: 'unknown', confidence: 0.1 };
        }
    }

    private classifyUserInteraction(
        event: RawEvent,
    ): { label: IntentClass; confidence: number } {
        const action = event.payload.action;
        const target = event.payload.target;
        const tagName = target?.tagName || '';
        const role = target?.aria?.role || '';
        const inputType = target?.inputType || '';

        // Data entry: typing in inputs, textareas
        if (action === 'input' || action === 'paste') {
            if (inputType === 'password' || inputType === 'email') {
                return { label: 'authentication', confidence: 0.85 };
            }
            return { label: 'data_entry', confidence: 0.9 };
        }

        // Navigation: clicking links, buttons that navigate
        if (action === 'navigate') {
            return { label: 'navigation', confidence: 0.95 };
        }

        if (action === 'click') {
            // Links
            if (tagName === 'a') {
                return { label: 'navigation', confidence: 0.85 };
            }
            // Submit buttons
            if (
                tagName === 'button' ||
                role === 'button' ||
                inputType === 'submit'
            ) {
                // Check if in a form context
                if (target?.formId) {
                    return { label: 'data_entry', confidence: 0.8 };
                }
                return { label: 'workflow_transition', confidence: 0.7 };
            }
            // Checkboxes / toggles
            if (inputType === 'checkbox' || inputType === 'radio') {
                return { label: 'configuration', confidence: 0.75 };
            }
        }

        if (action === 'select') {
            return { label: 'data_entry', confidence: 0.85 };
        }

        if (action === 'copy') {
            return { label: 'data_extraction', confidence: 0.8 };
        }

        if (action === 'scroll') {
            return { label: 'research', confidence: 0.5 };
        }

        if (action === 'focus') {
            return { label: 'navigation', confidence: 0.4 };
        }

        return { label: 'unknown', confidence: 0.2 };
    }

    private classifyDomMutation(
        event: RawEvent,
    ): { label: IntentClass; confidence: number } {
        const mutations = event.payload.mutations || [];
        if (mutations.length === 0) return { label: 'unknown', confidence: 0.1 };

        // Large DOM changes suggest page transitions
        const totalNodes = mutations.reduce(
            (sum, m) => sum + m.addedNodes + m.removedNodes,
            0,
        );
        if (totalNodes > 20) {
            return { label: 'navigation', confidence: 0.6 };
        }

        // Form-related mutations
        const formMutations = mutations.filter(
            (m) =>
                ['input', 'textarea', 'select'].includes(m.target.tagName) ||
                m.target.formId !== null,
        );
        if (formMutations.length > 0) {
            return { label: 'data_entry', confidence: 0.5 };
        }

        return { label: 'workflow_transition', confidence: 0.4 };
    }

    private classifyNetworkEvent(
        event: RawEvent,
    ): { label: IntentClass; confidence: number } {
        const method = event.payload.method?.toUpperCase() || 'GET';
        const url = event.payload.url || '';
        const status = event.payload.statusCode || 0;

        // Categorize by HTTP method
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            if (url.includes('auth') || url.includes('login') || url.includes('token')) {
                return { label: 'authentication', confidence: 0.85 };
            }
            if (url.includes('message') || url.includes('email') || url.includes('send')) {
                return { label: 'communication', confidence: 0.75 };
            }
            return { label: 'data_entry', confidence: 0.7 };
        }

        if (method === 'DELETE') {
            return { label: 'workflow_transition', confidence: 0.7 };
        }

        // GET requests
        if (url.includes('search') || url.includes('query')) {
            return { label: 'research', confidence: 0.7 };
        }
        if (url.includes('export') || url.includes('download')) {
            return { label: 'data_extraction', confidence: 0.75 };
        }

        // Error responses
        if (status >= 400) {
            return { label: 'error_handling', confidence: 0.6 };
        }

        return { label: 'navigation', confidence: 0.4 };
    }

    /**
     * Generate a 128-dimensional intent vector.
     * Uses deterministic seeding from intent class + event features
     * for consistent embedding space.
     */
    private generateVector(label: IntentClass, event: RawEvent): number[] {
        const seed = INTENT_SEEDS[label];
        const vector = new Array<number>(128);

        // Base vector from intent class (deterministic)
        let rng = seed;
        for (let i = 0; i < 128; i++) {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            vector[i] = ((rng / 0x7fffffff) * 2 - 1) * 0.5;
        }

        // Modulate with event features for within-class discrimination
        const features = this.extractFeatures(event);
        for (let i = 0; i < features.length && i < 128; i++) {
            vector[i] = vector[i] * 0.7 + features[i] * 0.3;
        }

        // L2 normalize
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < 128; i++) {
                vector[i] = Math.round((vector[i] / norm) * 10000) / 10000;
            }
        }

        return vector;
    }

    /**
     * Extract numerical features from event for vector modulation.
     */
    private extractFeatures(event: RawEvent): number[] {
        const features: number[] = [];

        // Action type encoding
        const actions = [
            'click',
            'input',
            'scroll',
            'navigate',
            'focus',
            'select',
            'copy',
            'paste',
        ];
        const actionIdx = actions.indexOf(event.payload.action || '');
        features.push(actionIdx >= 0 ? actionIdx / actions.length : 0);

        // Element type encoding
        const tagName = event.payload.target?.tagName || '';
        features.push(this.hashToFloat(tagName));

        // DOM depth
        const domPath = event.payload.target?.domPath || [];
        features.push(Math.min(domPath.length / 20, 1));

        // Viewport position (if available)
        const pos = event.payload.target?.position;
        if (pos) {
            features.push(pos.relativeX);
            features.push(pos.relativeY);
        } else {
            features.push(0);
            features.push(0);
        }

        // Network method encoding
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        const methodIdx = methods.indexOf(
            event.payload.method?.toUpperCase() || '',
        );
        features.push(methodIdx >= 0 ? methodIdx / methods.length : 0);

        // Status code normalized
        features.push((event.payload.statusCode || 0) / 600);

        // Pad to 128
        while (features.length < 128) {
            features.push(0);
        }

        return features.slice(0, 128);
    }

    private hashToFloat(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
        }
        return (hash & 0x7fffffff) / 0x7fffffff;
    }
}
