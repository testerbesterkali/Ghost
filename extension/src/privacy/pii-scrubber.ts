/**
 * PII Scrubber — Detects and replaces personally identifiable information.
 * PRD §3.2 Layer 1: Presidio-equivalent for browser context.
 * Entity recognition: Emails, phone numbers, SSNs, credit cards, names.
 * Replacement: [EMAIL_1], [NAME_2] with consistent hashing for pattern matching.
 */

/** Detected PII entity */
interface PiiEntity {
    type: string;
    value: string;
    start: number;
    end: number;
}

/** Consistent replacement counters per type within a session */
const entityCounters: Map<string, Map<string, number>> = new Map();

export class PiiScrubber {
    private patterns: Array<{ type: string; regex: RegExp }>;

    constructor() {
        this.patterns = [
            // Email addresses
            {
                type: 'EMAIL',
                regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            },
            // Phone numbers (international + US formats)
            {
                type: 'PHONE',
                regex:
                    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
            },
            // SSN (US)
            {
                type: 'SSN',
                regex: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
            },
            // Credit card numbers (Visa, MC, Amex, Discover)
            {
                type: 'CREDIT_CARD',
                regex:
                    /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
            },
            // IP addresses
            {
                type: 'IP_ADDRESS',
                regex:
                    /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
            },
            // URLs with auth tokens (Bearer, api_key, token, etc.)
            {
                type: 'AUTH_TOKEN',
                regex:
                    /(?:Bearer\s+[A-Za-z0-9\-._~+/]+=*|(?:api[_-]?key|token|secret|password|auth)[=:]\s*[^\s&"']+)/gi,
            },
            // Date of birth patterns
            {
                type: 'DOB',
                regex:
                    /\b(?:0[1-9]|1[0-2])[/\-.](?:0[1-9]|[12]\d|3[01])[/\-.](?:19|20)\d{2}\b/g,
            },
        ];
    }

    /**
     * Scrub all PII from text, returning sanitized version.
     * Uses consistent hashing: same input value always maps to same [TYPE_N].
     */
    scrub(text: string): string {
        if (!text) return text;

        const entities = this.detect(text);
        if (entities.length === 0) return text;

        // Sort entities by position (descending) to replace from end to start
        entities.sort((a, b) => b.start - a.start);

        let result = text;
        for (const entity of entities) {
            const replacement = this.getReplacement(entity.type, entity.value);
            result =
                result.slice(0, entity.start) + replacement + result.slice(entity.end);
        }

        return result;
    }

    /**
     * Detect PII entities in text.
     */
    detect(text: string): PiiEntity[] {
        const entities: PiiEntity[] = [];

        for (const pattern of this.patterns) {
            // Reset regex state
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                entities.push({
                    type: pattern.type,
                    value: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                });
            }
        }

        // Remove overlapping entities (keep longest)
        return this.removeOverlaps(entities);
    }

    /**
     * Check if text contains any PII.
     */
    containsPii(text: string): boolean {
        return this.detect(text).length > 0;
    }

    /**
     * Get consistent replacement token for a PII value.
     * Same value always maps to same [TYPE_N] within a session.
     */
    private getReplacement(type: string, value: string): string {
        if (!entityCounters.has(type)) {
            entityCounters.set(type, new Map());
        }

        const typeMap = entityCounters.get(type)!;
        const normalizedValue = value.toLowerCase().replace(/[\s\-.]/g, '');

        if (!typeMap.has(normalizedValue)) {
            typeMap.set(normalizedValue, typeMap.size + 1);
        }

        return `[${type}_${typeMap.get(normalizedValue)}]`;
    }

    private removeOverlaps(entities: PiiEntity[]): PiiEntity[] {
        if (entities.length <= 1) return entities;

        // Sort by start position, then by length (longest first)
        entities.sort((a, b) => a.start - b.start || b.end - a.end);

        const result: PiiEntity[] = [entities[0]];
        for (let i = 1; i < entities.length; i++) {
            const prev = result[result.length - 1];
            if (entities[i].start >= prev.end) {
                result.push(entities[i]);
            } else if (
                entities[i].end - entities[i].start >
                prev.end - prev.start
            ) {
                result[result.length - 1] = entities[i];
            }
        }

        return result;
    }

    /**
     * Reset entity counters (call on session rotation).
     */
    static resetCounters(): void {
        entityCounters.clear();
    }
}
