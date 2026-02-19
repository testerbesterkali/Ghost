/**
 * Privacy Pipeline — Orchestrates the full on-device privacy processing.
 * PRD §3.2: Converts RawEvent → SecureEvent.
 * Ensures NO raw text, NO URLs, NO screenshots leave the device.
 */

import { RawEvent } from '../types/raw-event';
import { SecureEvent } from '../types/secure-event';
import { PiiScrubber } from './pii-scrubber';
import { IntentEncoder } from './intent-encoder';
import { DifferentialPrivacy } from './differential-privacy';

export class PrivacyPipeline {
    private piiScrubber: PiiScrubber;
    private intentEncoder: IntentEncoder;
    private differentialPrivacy: DifferentialPrivacy;
    private sequenceCounter: number = 0;
    private orgId: string;
    private deviceId: string;
    private userId: string;

    constructor(orgId: string, deviceId: string, userId: string) {
        this.piiScrubber = new PiiScrubber();
        this.intentEncoder = new IntentEncoder();
        this.differentialPrivacy = new DifferentialPrivacy();
        this.orgId = orgId;
        this.deviceId = deviceId;
        this.userId = userId;
    }

    /**
     * Process a RawEvent through the full privacy pipeline.
     * Steps (per PRD §3.2):
     *   1. PII scrubbing (Presidio-equivalent)
     *   2. Intent encoding (TinyBERT-equivalent)
     *   3. Differential privacy (noise injection)
     * Output: SecureEvent with no raw content.
     */
    async process(event: RawEvent): Promise<SecureEvent> {
        // Step 1: Scrub any PII from the event (in-place on clone)
        const scrubbed = this.scrubEvent(event);

        // Step 2: Encode intent
        const intent = this.intentEncoder.encode(scrubbed);

        // Step 3: Apply differential privacy
        const noisyVector = this.differentialPrivacy.perturbVector(intent.vector);
        const timestampBucket = this.differentialPrivacy.anonymizeTimestamp(
            Date.now(),
        );
        const sessionFingerprint =
            await this.differentialPrivacy.generateSessionFingerprint(
                this.deviceId,
                this.userId,
                Date.now(),
            );

        // Generate structural hash (DOM structure, no content)
        const domPath = event.payload.target?.domPath || [];
        const tagName = event.payload.target?.tagName || '';
        const structuralHash = this.differentialPrivacy.generateStructuralHash(
            domPath,
            tagName,
        );

        // Generate element signature (ARIA + path only)
        const elementSignature = event.payload.target
            ? this.differentialPrivacy.generateElementSignature(
                event.payload.target.aria.role,
                domPath,
                tagName,
            )
            : null;

        this.sequenceCounter++;

        return {
            sessionFingerprint,
            timestampBucket,
            intentVector: noisyVector,
            structuralHash,
            orgId: this.orgId,
            eventType: event.eventType,
            intentLabel: intent.label,
            intentConfidence: Math.round(intent.confidence * 100) / 100,
            elementSignature,
            sequenceNumber: this.sequenceCounter,
        };
    }

    /**
     * Scrub PII from event payload fields.
     * Returns a new event object — does not mutate original.
     */
    private scrubEvent(event: RawEvent): RawEvent {
        const scrubbed = structuredClone(event);

        // Scrub text values
        if (scrubbed.payload.value) {
            scrubbed.payload.value = this.piiScrubber.scrub(scrubbed.payload.value);
        }
        if (scrubbed.payload.message) {
            scrubbed.payload.message = this.piiScrubber.scrub(
                scrubbed.payload.message,
            );
        }

        // Scrub element text preview
        if (scrubbed.payload.target?.textPreview) {
            scrubbed.payload.target.textPreview = this.piiScrubber.scrub(
                scrubbed.payload.target.textPreview,
            );
        }

        // Scrub mutation old/new values
        if (scrubbed.payload.mutations) {
            for (const mutation of scrubbed.payload.mutations) {
                if (mutation.oldValue) {
                    mutation.oldValue = this.piiScrubber.scrub(mutation.oldValue);
                }
                if (mutation.newValue) {
                    mutation.newValue = this.piiScrubber.scrub(mutation.newValue);
                }
            }
        }

        // URL is already sanitized by NetworkObserver, but double-check
        if (scrubbed.payload.url && this.piiScrubber.containsPii(scrubbed.payload.url)) {
            scrubbed.payload.url = this.piiScrubber.scrub(scrubbed.payload.url);
        }

        // Remove page URL from context (privacy)
        scrubbed.context.url = this.hashUrl(scrubbed.context.url);

        return scrubbed;
    }

    /**
     * Hash a URL to prevent origin leakage while preserving domain grouping.
     */
    private hashUrl(url: string): string {
        try {
            const u = new URL(url);
            // Keep only the origin (protocol + domain) — hash the path
            const pathHash = this.fnv1a(u.pathname + u.search);
            return `${u.origin}/${pathHash.toString(16)}`;
        } catch {
            return '[INVALID_URL]';
        }
    }

    private fnv1a(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
    }

    /**
     * Reset pipeline state (call on session rotation).
     */
    reset(): void {
        this.sequenceCounter = 0;
        PiiScrubber.resetCounters();
    }
}
