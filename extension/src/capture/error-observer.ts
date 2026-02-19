/**
 * ErrorObserver — Console/error logging for failure analysis.
 * PRD §3.1.1: Console/error events for workflow failure detection.
 */

import { RawEvent } from '../types/raw-event';

export class ErrorObserver {
    private onEvent: (event: RawEvent) => void;
    private sessionId: string;
    private tabId: string;
    private boundHandlers: {
        error: (e: ErrorEvent) => void;
        unhandledRejection: (e: PromiseRejectionEvent) => void;
    };

    constructor(
        onEvent: (event: RawEvent) => void,
        sessionId: string,
        tabId: string,
    ) {
        this.onEvent = onEvent;
        this.sessionId = sessionId;
        this.tabId = tabId;
        this.boundHandlers = {
            error: this.handleError.bind(this),
            unhandledRejection: this.handleRejection.bind(this),
        };
    }

    start(): void {
        window.addEventListener('error', this.boundHandlers.error);
        window.addEventListener(
            'unhandledrejection',
            this.boundHandlers.unhandledRejection,
        );
    }

    stop(): void {
        window.removeEventListener('error', this.boundHandlers.error);
        window.removeEventListener(
            'unhandledrejection',
            this.boundHandlers.unhandledRejection,
        );
    }

    updateSession(sessionId: string): void {
        this.sessionId = sessionId;
    }

    private handleError(e: ErrorEvent): void {
        this.emit(
            e.message || 'Unknown error',
            e.error?.stack || '',
            e.filename || '',
        );
    }

    private handleRejection(e: PromiseRejectionEvent): void {
        const message =
            e.reason instanceof Error
                ? e.reason.message
                : String(e.reason);
        const stack =
            e.reason instanceof Error ? e.reason.stack || '' : '';
        this.emit(message, stack, 'unhandled-promise');
    }

    private emit(message: string, stack: string, source: string): void {
        // Truncate to prevent large payloads
        const event: RawEvent = {
            timestamp: performance.now(),
            sessionId: this.sessionId,
            eventType: 'error',
            payload: {
                message: message.slice(0, 500),
                stack: stack.slice(0, 1000),
                source,
            },
            context: {
                url: window.location.href,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                userAgent: navigator.userAgent,
                tabId: this.tabId,
            },
        };
        this.onEvent(event);
    }
}
