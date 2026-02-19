/**
 * DomObserver — MutationObserver with subtree monitoring.
 * PRD §3.1.1: DOM mutations capture with snapshotHash for integrity verification.
 * Throttled to respect <5% CPU overhead / <50MB RAM budget.
 */

import { RawEvent, MutationSummary } from '../types/raw-event';
import { ElementFingerprinter } from './element-fingerprinter';

export class DomObserver {
    private observer: MutationObserver | null = null;
    private fingerprinter: ElementFingerprinter;
    private onEvent: (event: RawEvent) => void;
    private sessionId: string;
    private tabId: string;

    /** Throttle: batch mutations over 500ms windows */
    private pendingMutations: MutationRecord[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly FLUSH_INTERVAL_MS = 500;

    /** DOM snapshot hash for integrity */
    private lastSnapshotHash: string = '';

    constructor(
        onEvent: (event: RawEvent) => void,
        sessionId: string,
        tabId: string,
    ) {
        this.fingerprinter = new ElementFingerprinter();
        this.onEvent = onEvent;
        this.sessionId = sessionId;
        this.tabId = tabId;
    }

    start(): void {
        if (this.observer) return;

        this.observer = new MutationObserver((mutations) => {
            this.pendingMutations.push(...mutations);
            if (!this.flushTimer) {
                this.flushTimer = setTimeout(
                    () => this.flush(),
                    this.FLUSH_INTERVAL_MS,
                );
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            attributes: true,
            characterData: true,
            subtree: true,
            attributeOldValue: true,
            characterDataOldValue: true,
        });

        this.lastSnapshotHash = this.computeSnapshotHash();
    }

    stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        this.pendingMutations = [];
    }

    updateSession(sessionId: string): void {
        this.sessionId = sessionId;
    }

    private flush(): void {
        this.flushTimer = null;
        if (this.pendingMutations.length === 0) return;

        const mutations = this.pendingMutations.splice(0);
        const summaries = this.summarizeMutations(mutations);

        if (summaries.length === 0) return;

        const newHash = this.computeSnapshotHash();

        const event: RawEvent = {
            timestamp: performance.now(),
            sessionId: this.sessionId,
            eventType: 'dom_mut',
            payload: {
                mutations: summaries,
                snapshotHash: newHash,
            },
            context: {
                url: this.normalizeUrl(window.location.href),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
                userAgent: navigator.userAgent,
                tabId: this.tabId,
            },
        };

        this.lastSnapshotHash = newHash;
        this.onEvent(event);
    }

    /**
     * Summarize MutationRecords into compact MutationSummary objects.
     * Deduplicates and filters noise (style-only, script-injected, hidden elements).
     */
    private summarizeMutations(records: MutationRecord[]): MutationSummary[] {
        const summaries: MutationSummary[] = [];
        const seen = new Set<string>();

        for (const record of records) {
            const target = record.target;
            if (!(target instanceof Element)) continue;

            // Skip non-visible and script/style mutations
            if (this.isNoisyMutation(target, record)) continue;

            const key = `${record.type}:${this.getStableKey(target)}:${record.attributeName || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);

            try {
                summaries.push({
                    type: record.type as MutationSummary['type'],
                    target: this.fingerprinter.fingerprint(target),
                    addedNodes: record.addedNodes.length,
                    removedNodes: record.removedNodes.length,
                    attributeName: record.attributeName || null,
                    oldValue: record.oldValue?.slice(0, 100) || null,
                    newValue:
                        record.type === 'attributes' && record.attributeName
                            ? target.getAttribute(record.attributeName)?.slice(0, 100) || null
                            : null,
                });
            } catch {
                // Element may have been removed from DOM
            }

            // Cap summaries to prevent memory explosion
            if (summaries.length >= 50) break;
        }

        return summaries;
    }

    private isNoisyMutation(target: Element, record: MutationRecord): boolean {
        const tag = target.tagName?.toLowerCase();
        // Skip script/style/meta mutations
        if (['script', 'style', 'link', 'meta', 'noscript'].includes(tag)) {
            return true;
        }
        // Skip mutations in Ghost's own shadow DOM
        if (target.closest?.('[data-ghost-shadow]')) return true;
        // Skip attribute mutations that are purely visual (class, style)
        if (
            record.type === 'attributes' &&
            record.attributeName &&
            ['class', 'style'].includes(record.attributeName)
        ) {
            // Only skip if the element is not interactive
            if (!this.isInteractive(target)) return true;
        }
        return false;
    }

    private isInteractive(el: Element): boolean {
        const tag = el.tagName?.toLowerCase();
        return (
            ['input', 'textarea', 'select', 'button', 'a'].includes(tag) ||
            el.getAttribute('role') === 'button' ||
            el.getAttribute('contenteditable') === 'true' ||
            el.hasAttribute('onclick')
        );
    }

    private getStableKey(el: Element): string {
        const tag = el.tagName?.toLowerCase() || 'unknown';
        const role = el.getAttribute('role') || '';
        const label = el.getAttribute('aria-label') || '';
        return `${tag}:${role}:${label}`;
    }

    /**
     * Compute a hash of DOM structural shape (tags + depth, no content).
     * Fast FNV-1a over tag tree for integrity verification.
     */
    private computeSnapshotHash(): string {
        const walk = (node: Element, depth: number): string => {
            if (depth > 10) return '';
            let str = node.tagName || '';
            const children = node.children;
            for (let i = 0; i < Math.min(children.length, 20); i++) {
                str += walk(children[i], depth + 1);
            }
            return str;
        };

        const structure = walk(document.body, 0);
        return this.fnv1a(structure).toString(16);
    }

    private fnv1a(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            // Remove tracking params
            const tracking = [
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'fbclid',
                'gclid',
            ];
            tracking.forEach((p) => u.searchParams.delete(p));
            return `${u.origin}${u.pathname}${u.search}`;
        } catch {
            return url;
        }
    }
}
