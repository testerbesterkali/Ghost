/**
 * RawEvent — Per-event data structure captured on-device.
 * PRD §3.1.1 Data Structure (exact schema from PRD).
 */

import { ElementFingerprint } from './element-fingerprint';

export type EventType = 'dom_mut' | 'user_int' | 'network' | 'error';
export type UserAction = 'click' | 'input' | 'scroll' | 'navigate' | 'focus' | 'select' | 'copy' | 'paste';

export interface MutationSummary {
    type: 'childList' | 'attributes' | 'characterData';
    target: ElementFingerprint;
    addedNodes: number;
    removedNodes: number;
    attributeName: string | null;
    oldValue: string | null;
    newValue: string | null;
}

export interface RawEvent {
    /** High-precision, monotonic clock */
    timestamp: number;
    /** Ephemeral, rotated every 15min */
    sessionId: string;
    eventType: EventType;
    payload: {
        // For user_int:
        action?: UserAction;
        target?: ElementFingerprint;
        /** Raw value — will be scrubbed by privacy pipeline before transmission */
        value?: string;

        // For dom_mut:
        mutations?: MutationSummary[];
        snapshotHash?: string;

        // For network:
        url?: string;
        method?: string;
        statusCode?: number;
        responseType?: string;

        // For error:
        message?: string;
        stack?: string;
        source?: string;
    };
    context: {
        /** Current page URL, normalized */
        url: string;
        viewport: { width: number; height: number };
        userAgent: string;
        tabId: string;
    };
}
