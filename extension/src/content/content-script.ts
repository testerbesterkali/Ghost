/**
 * Content Script — Injected into all pages, captures DOM events.
 * PRD §3.1.1: Shadow DOM isolation to prevent site detection/conflict.
 * Captures: DOM mutations, user interactions, network, errors.
 * Sends RawEvents to service worker for privacy processing + transmission.
 */

import { RawEvent } from '../types/raw-event';
import { DomObserver } from '../capture/dom-observer';
import { InteractionTracker } from '../capture/interaction-tracker';
import { NetworkObserver } from '../capture/network-observer';
import { ErrorObserver } from '../capture/error-observer';

class GhostContentScript {
    private domObserver: DomObserver | null = null;
    private interactionTracker: InteractionTracker | null = null;
    private networkObserver: NetworkObserver | null = null;
    private errorObserver: ErrorObserver | null = null;
    private sessionId: string;
    private tabId: string;
    private isActive: boolean = false;
    private eventCount: number = 0;
    private sessionRotationTimer: ReturnType<typeof setInterval> | null = null;

    /** PRD: Session rotated every 15 minutes */
    private readonly SESSION_ROTATION_MS = 15 * 60 * 1000;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.tabId = this.generateTabId();
    }

    /**
     * Initialize and start capturing.
     */
    async start(): Promise<void> {
        // Check if extension says we should be active
        const config = await this.getConfig();
        if (!config.enabled) return;

        this.isActive = true;

        // Create Shadow DOM container for Ghost UI (PRD: Shadow DOM isolation)
        this.createShadowContainer();

        // Initialize all observers
        const handler = this.handleRawEvent.bind(this);

        this.domObserver = new DomObserver(handler, this.sessionId, this.tabId);
        this.interactionTracker = new InteractionTracker(
            handler,
            this.sessionId,
            this.tabId,
        );
        this.networkObserver = new NetworkObserver(
            handler,
            this.sessionId,
            this.tabId,
        );
        this.errorObserver = new ErrorObserver(handler, this.sessionId, this.tabId);

        // Start all capture modules
        this.domObserver.start();
        this.interactionTracker.start();
        this.networkObserver.start();
        this.errorObserver.start();

        // Session rotation (PRD: every 15 minutes)
        this.sessionRotationTimer = setInterval(() => {
            this.rotateSession();
        }, this.SESSION_ROTATION_MS);

        // Notify service worker that content script is active
        this.sendToServiceWorker({
            type: 'CONTENT_SCRIPT_READY',
            tabId: this.tabId,
            url: window.location.href,
        });
    }

    /**
     * Stop all capture.
     */
    stop(): void {
        this.isActive = false;
        this.domObserver?.stop();
        this.interactionTracker?.stop();
        this.networkObserver?.stop();
        this.errorObserver?.stop();

        if (this.sessionRotationTimer) {
            clearInterval(this.sessionRotationTimer);
            this.sessionRotationTimer = null;
        }
    }

    /**
     * Handle a RawEvent from any observer.
     * Sends to service worker for privacy processing.
     */
    private handleRawEvent(event: RawEvent): void {
        if (!this.isActive) return;

        this.eventCount++;

        // Send to service worker via chrome.runtime
        this.sendToServiceWorker({
            type: 'RAW_EVENT',
            event,
        });
    }

    /**
     * Rotate session ID for privacy (PRD: every 15 minutes).
     */
    private rotateSession(): void {
        this.sessionId = this.generateSessionId();

        // Update all observers with new session
        this.domObserver?.updateSession(this.sessionId);
        this.interactionTracker?.updateSession(this.sessionId);
        this.networkObserver?.updateSession(this.sessionId);
        this.errorObserver?.updateSession(this.sessionId);

        this.sendToServiceWorker({
            type: 'SESSION_ROTATED',
            sessionId: this.sessionId,
        });
    }

    /**
     * Create an isolated Shadow DOM container for Ghost UI elements.
     * PRD §3.1.1: Shadow DOM isolation to prevent site detection/conflict.
     */
    private createShadowContainer(): void {
        // Check if already created
        if (document.querySelector('[data-ghost-shadow]')) return;

        const host = document.createElement('div');
        host.setAttribute('data-ghost-shadow', 'true');
        host.style.cssText =
            'position:fixed;z-index:2147483647;pointer-events:none;top:0;left:0;width:0;height:0;';

        const shadow = host.attachShadow({ mode: 'closed' });

        // Status indicator (small dot)
        const indicator = document.createElement('div');
        indicator.id = 'ghost-status';
        indicator.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      opacity: 0.6;
      pointer-events: none;
      transition: opacity 0.3s;
      z-index: 2147483647;
    `;
        shadow.appendChild(indicator);
        document.documentElement.appendChild(host);
    }

    /**
     * Send a message to the service worker.
     */
    private sendToServiceWorker(message: any): void {
        try {
            chrome.runtime.sendMessage(message);
        } catch {
            // Extension context invalidated — stop capturing
            this.stop();
        }
    }

    /**
     * Get config from chrome.storage.
     */
    private async getConfig(): Promise<{ enabled: boolean }> {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['ghost_enabled'], (result) => {
                    resolve({ enabled: result.ghost_enabled !== false });
                });
            } catch {
                resolve({ enabled: false });
            }
        });
    }

    /**
     * Generate an ephemeral session ID.
     */
    private generateSessionId(): string {
        return crypto.randomUUID();
    }

    /**
     * Generate a tab-specific ID.
     */
    private generateTabId(): string {
        return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}

// --- Listen for messages from service worker ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_CAPTURE') {
        if (message.enabled) {
            ghost.start();
        } else {
            ghost.stop();
        }
        sendResponse({ ok: true });
    }
    if (message.type === 'GET_STATUS') {
        sendResponse({ active: true });
    }
    return true;
});

// --- Initialize ---
const ghost = new GhostContentScript();
ghost.start();
