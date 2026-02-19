/**
 * NetworkObserver — Observes API calls via PerformanceObserver (content script)
 * and webRequest (service worker).
 * PRD §3.1.1: Network interception for API call observation.
 * URLs are sanitized (query params hashed) before storage.
 */

import { RawEvent } from '../types/raw-event';

/**
 * Content-script side: uses PerformanceObserver to detect fetch/XHR calls.
 * Does NOT intercept request bodies (privacy constraint).
 */
export class NetworkObserver {
    private observer: PerformanceObserver | null = null;
    private onEvent: (event: RawEvent) => void;
    private sessionId: string;
    private tabId: string;
    private seenUrls = new Set<string>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        onEvent: (event: RawEvent) => void,
        sessionId: string,
        tabId: string,
    ) {
        this.onEvent = onEvent;
        this.sessionId = sessionId;
        this.tabId = tabId;
    }

    start(): void {
        if (typeof PerformanceObserver === 'undefined') return;

        this.observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    this.handleResourceEntry(entry as PerformanceResourceTiming);
                }
            }
        });

        try {
            this.observer.observe({ type: 'resource', buffered: false });
        } catch {
            // Fallback for browsers that don't support type
            this.observer.observe({ entryTypes: ['resource'] });
        }

        // Intercept fetch for status codes (PerformanceObserver doesn't give status)
        this.patchFetch();
        this.patchXHR();

        // Periodically clean the seenUrls set to prevent memory leak
        this.cleanupTimer = setInterval(
            () => {
                this.seenUrls.clear();
            },
            5 * 60 * 1000,
        );
    }

    stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    updateSession(sessionId: string): void {
        this.sessionId = sessionId;
    }

    private handleResourceEntry(entry: PerformanceResourceTiming): void {
        // Only observe API-like calls (fetch, xmlhttprequest)
        const initiator = entry.initiatorType;
        if (!['fetch', 'xmlhttprequest'].includes(initiator)) return;

        const url = this.sanitizeUrl(entry.name);
        const dedupeKey = `${url}:${Math.round(entry.startTime / 1000)}`;
        if (this.seenUrls.has(dedupeKey)) return;
        this.seenUrls.add(dedupeKey);

        const event: RawEvent = {
            timestamp: entry.startTime,
            sessionId: this.sessionId,
            eventType: 'network',
            payload: {
                url,
                method: 'UNKNOWN', // PerformanceObserver doesn't expose method
                statusCode: 0, // Will be enriched by fetch/XHR patch
                responseType: entry.initiatorType,
            },
            context: {
                url: this.normalizeUrl(window.location.href),
                viewport: { width: window.innerWidth, height: window.innerHeight },
                userAgent: navigator.userAgent,
                tabId: this.tabId,
            },
        };

        this.onEvent(event);
    }

    /**
     * Monkey-patch fetch to capture method + status code.
     */
    private patchFetch(): void {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = async function (...args: Parameters<typeof fetch>) {
            const request = args[0];
            const init = args[1];

            let method = 'GET';
            let url = '';

            if (typeof request === 'string') {
                url = request;
                method = init?.method || 'GET';
            } else if (request instanceof Request) {
                url = request.url;
                method = request.method;
            } else {
                url = String(request);
            }

            try {
                const response = await originalFetch.apply(this, args);
                self.emitNetworkEvent(url, method, response.status, 'fetch');
                return response;
            } catch (error) {
                self.emitNetworkEvent(url, method, 0, 'fetch');
                throw error;
            }
        };
    }

    /**
     * Monkey-patch XMLHttpRequest to capture method + status code.
     */
    private patchXHR(): void {
        const self = this;
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (
            method: string,
            url: string | URL,
            ...rest: any[]
        ) {
            (this as any).__ghost_method = method;
            (this as any).__ghost_url = String(url);
            return originalOpen.apply(this, [method, url, ...rest] as any);
        };

        XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
            this.addEventListener('loadend', function () {
                self.emitNetworkEvent(
                    (this as any).__ghost_url || '',
                    (this as any).__ghost_method || 'GET',
                    this.status,
                    'xmlhttprequest',
                );
            });
            return originalSend.call(this, body);
        };
    }

    private emitNetworkEvent(
        url: string,
        method: string,
        statusCode: number,
        responseType: string,
    ): void {
        const event: RawEvent = {
            timestamp: performance.now(),
            sessionId: this.sessionId,
            eventType: 'network',
            payload: {
                url: this.sanitizeUrl(url),
                method,
                statusCode,
                responseType,
            },
            context: {
                url: this.normalizeUrl(window.location.href),
                viewport: { width: window.innerWidth, height: window.innerHeight },
                userAgent: navigator.userAgent,
                tabId: this.tabId,
            },
        };
        this.onEvent(event);
    }

    /** Hash query parameters to prevent PII leakage via URLs */
    private sanitizeUrl(url: string): string {
        try {
            const u = new URL(url, window.location.origin);
            const sanitized = new URL(u.origin + u.pathname);
            // Hash each query param value
            if (u.search) {
                u.searchParams.forEach((value, key) => {
                    sanitized.searchParams.set(key, this.hashValue(value));
                });
            }
            return sanitized.toString();
        } catch {
            return '[INVALID_URL]';
        }
    }

    private hashValue(value: string): string {
        let hash = 0x811c9dc5;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash.toString(16);
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            return `${u.origin}${u.pathname}`;
        } catch {
            return url;
        }
    }
}
