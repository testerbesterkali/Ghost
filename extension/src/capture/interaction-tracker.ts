/**
 * InteractionTracker — Captures user interactions with target element serialization.
 * PRD §3.1.1: click, input, scroll, focus + ElementFingerprint per event.
 * Performance: <5% CPU overhead via passive listeners + throttled scroll.
 */

import { RawEvent, UserAction } from '../types/raw-event';
import { ElementFingerprinter } from './element-fingerprinter';

export class InteractionTracker {
    private fingerprinter: ElementFingerprinter;
    private onEvent: (event: RawEvent) => void;
    private sessionId: string;
    private tabId: string;
    private listeners: Array<{ type: string; handler: EventListener }> = [];
    private lastScrollTime: number = 0;
    private readonly SCROLL_THROTTLE_MS = 300;

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
        this.addListener('click', this.handleClick.bind(this), true);
        this.addListener('input', this.handleInput.bind(this), true);
        this.addListener('focus', this.handleFocus.bind(this), true);
        this.addListener('scroll', this.handleScroll.bind(this), {
            passive: true,
            capture: true,
        });
        this.addListener('copy', this.handleClipboard.bind(this, 'copy'), true);
        this.addListener('paste', this.handleClipboard.bind(this, 'paste'), true);
        this.addListener('change', this.handleChange.bind(this), true);
        // Navigation via popstate
        window.addEventListener('popstate', this.handleNavigation.bind(this));
    }

    stop(): void {
        for (const { type, handler } of this.listeners) {
            document.removeEventListener(type, handler, true);
        }
        this.listeners = [];
        window.removeEventListener('popstate', this.handleNavigation.bind(this));
    }

    updateSession(sessionId: string): void {
        this.sessionId = sessionId;
    }

    private addListener(
        type: string,
        handler: EventListener,
        options: boolean | AddEventListenerOptions,
    ): void {
        document.addEventListener(type, handler, options);
        this.listeners.push({ type, handler });
    }

    private handleClick(e: Event): void {
        const target = e.target as Element;
        if (!target || this.isGhostElement(target)) return;

        this.emit('click', target);
    }

    private handleInput(e: Event): void {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (!target || this.isGhostElement(target)) return;

        // Don't capture password fields
        if (target instanceof HTMLInputElement && target.type === 'password') {
            this.emit('input', target, '[PASSWORD]');
            return;
        }

        this.emit('input', target, target.value);
    }

    private handleFocus(e: Event): void {
        const target = e.target as Element;
        if (!target || this.isGhostElement(target)) return;
        if (!this.isInteractive(target)) return;

        this.emit('focus', target);
    }

    private handleScroll(_e: Event): void {
        const now = performance.now();
        if (now - this.lastScrollTime < this.SCROLL_THROTTLE_MS) return;
        this.lastScrollTime = now;

        this.emit('scroll', document.documentElement, undefined);
    }

    private handleClipboard(action: 'copy' | 'paste', _e: Event): void {
        const target = document.activeElement;
        if (!target) return;

        this.emit(action, target as Element);
    }

    private handleChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        if (!target || this.isGhostElement(target)) return;
        if (!(target instanceof HTMLSelectElement)) return;

        this.emit('select', target, target.value);
    }

    private handleNavigation(): void {
        const event: RawEvent = {
            timestamp: performance.now(),
            sessionId: this.sessionId,
            eventType: 'user_int',
            payload: {
                action: 'navigate',
                value: window.location.href,
            },
            context: this.getContext(),
        };
        this.onEvent(event);
    }

    private emit(action: UserAction, target: Element, value?: string): void {
        try {
            const event: RawEvent = {
                timestamp: performance.now(),
                sessionId: this.sessionId,
                eventType: 'user_int',
                payload: {
                    action,
                    target: this.fingerprinter.fingerprint(target),
                    value,
                },
                context: this.getContext(),
            };
            this.onEvent(event);
        } catch {
            // Element may have been removed
        }
    }

    private getContext() {
        return {
            url: this.normalizeUrl(window.location.href),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            userAgent: navigator.userAgent,
            tabId: this.tabId,
        };
    }

    private isGhostElement(el: Element): boolean {
        return !!el.closest?.('[data-ghost-shadow]');
    }

    private isInteractive(el: Element): boolean {
        const tag = el.tagName?.toLowerCase();
        return (
            ['input', 'textarea', 'select', 'button', 'a'].includes(tag) ||
            el.getAttribute('role') === 'button' ||
            el.getAttribute('contenteditable') === 'true' ||
            el.hasAttribute('tabindex')
        );
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
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
