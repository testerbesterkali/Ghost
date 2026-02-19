/**
 * EventTransmitter — Batches SecureEvents and transmits to Supabase Edge Function.
 * PRD §7.1: POST /v1/sessions/batch — max 100/batch, rate limit 1000 events/min.
 * Implements retry with exponential backoff, offline queue, and batch compression.
 */

import { SecureEvent, SecureEventBatch } from '../types/secure-event';

interface TransmitterConfig {
    /** Supabase Edge Function URL for event ingestion */
    endpoint: string;
    /** Supabase anon key for API auth */
    apiKey: string;
    /** Max events per batch (PRD: 100) */
    maxBatchSize: number;
    /** Flush interval in ms */
    flushIntervalMs: number;
    /** Max retry attempts */
    maxRetries: number;
    /** Base retry delay in ms */
    retryBaseMs: number;
}

const DEFAULT_CONFIG: TransmitterConfig = {
    endpoint: '',
    apiKey: '',
    maxBatchSize: 100,
    flushIntervalMs: 10000, // 10 seconds
    maxRetries: 3,
    retryBaseMs: 1000,
};

export class EventTransmitter {
    private config: TransmitterConfig;
    private buffer: SecureEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isFlushing: boolean = false;
    private failedBatches: SecureEventBatch[] = [];
    private eventsSentThisMinute: number = 0;
    private rateLimitResetTimer: ReturnType<typeof setInterval> | null = null;
    private deviceFingerprint: string = '';

    /** Stats for monitoring */
    private stats = {
        totalSent: 0,
        totalFailed: 0,
        totalDropped: 0,
        totalBatches: 0,
    };

    constructor(config: Partial<TransmitterConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    async initialize(): Promise<void> {
        // Generate device fingerprint
        this.deviceFingerprint = await this.generateDeviceFingerprint();

        // Start flush interval
        this.flushTimer = setInterval(
            () => this.flush(),
            this.config.flushIntervalMs,
        );

        // Rate limit counter reset (every minute)
        this.rateLimitResetTimer = setInterval(() => {
            this.eventsSentThisMinute = 0;
        }, 60000);

        // Restore failed batches from storage
        await this.restoreFailedBatches();
    }

    /**
     * Queue a SecureEvent for transmission.
     * Will be batched and sent on next flush cycle.
     */
    enqueue(event: SecureEvent): void {
        // Rate limit check: 1000 events/minute per device (PRD §7.1)
        if (this.eventsSentThisMinute >= 1000) {
            this.stats.totalDropped++;
            return;
        }

        this.buffer.push(event);

        // Auto-flush if buffer reaches max batch size
        if (this.buffer.length >= this.config.maxBatchSize) {
            this.flush();
        }
    }

    /**
     * Force-flush all buffered events.
     */
    async flush(): Promise<void> {
        if (this.isFlushing || this.buffer.length === 0) return;
        this.isFlushing = true;

        try {
            // Take current buffer
            const events = this.buffer.splice(0, this.config.maxBatchSize);

            const batch: SecureEventBatch = {
                events,
                deviceFingerprint: this.deviceFingerprint,
                batchId: crypto.randomUUID(),
                sentAt: new Date().toISOString(),
            };

            await this.sendBatch(batch);

            // Try resending failed batches
            await this.retryFailedBatches();
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Send a batch to the Supabase Edge Function.
     */
    private async sendBatch(
        batch: SecureEventBatch,
        retryCount: number = 0,
    ): Promise<void> {
        if (!this.config.endpoint) {
            // No endpoint configured — store for later
            this.failedBatches.push(batch);
            return;
        }

        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'X-Ghost-Batch-Id': batch.batchId,
                    'X-Ghost-Device': batch.deviceFingerprint,
                },
                body: JSON.stringify(batch),
            });

            if (response.status === 202 || response.status === 200) {
                // Success
                this.stats.totalSent += batch.events.length;
                this.stats.totalBatches++;
                this.eventsSentThisMinute += batch.events.length;
                return;
            }

            if (response.status === 429) {
                // Rate limited — back off
                const retryAfter = parseInt(
                    response.headers.get('Retry-After') || '60',
                    10,
                );
                await this.delay(retryAfter * 1000);
                return this.sendBatch(batch, retryCount);
            }

            // Server error — retry
            if (response.status >= 500 && retryCount < this.config.maxRetries) {
                await this.delay(this.config.retryBaseMs * Math.pow(2, retryCount));
                return this.sendBatch(batch, retryCount + 1);
            }

            // Failed permanently
            this.stats.totalFailed += batch.events.length;
            this.failedBatches.push(batch);
            await this.persistFailedBatches();
        } catch (error) {
            // Network error — retry
            if (retryCount < this.config.maxRetries) {
                await this.delay(this.config.retryBaseMs * Math.pow(2, retryCount));
                return this.sendBatch(batch, retryCount + 1);
            }

            this.stats.totalFailed += batch.events.length;
            this.failedBatches.push(batch);
            await this.persistFailedBatches();
        }
    }

    /**
     * Retry failed batches.
     */
    private async retryFailedBatches(): Promise<void> {
        const batches = this.failedBatches.splice(0);
        for (const batch of batches) {
            await this.sendBatch(batch);
        }
    }

    /**
     * Persist failed batches to chrome.storage.local for offline resilience.
     */
    private async persistFailedBatches(): Promise<void> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                // Keep max 10 failed batches to prevent storage bloat
                const toStore = this.failedBatches.slice(-10);
                await chrome.storage.local.set({ ghost_failed_batches: toStore });
            }
        } catch {
            // Storage not available
        }
    }

    /**
     * Restore failed batches from storage on startup.
     */
    private async restoreFailedBatches(): Promise<void> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const result = await chrome.storage.local.get('ghost_failed_batches');
                if (result.ghost_failed_batches) {
                    this.failedBatches = result.ghost_failed_batches;
                    await chrome.storage.local.remove('ghost_failed_batches');
                }
            }
        } catch {
            // Storage not available
        }
    }

    /**
     * Update the endpoint and API key (called from popup settings).
     */
    configure(endpoint: string, apiKey: string): void {
        this.config.endpoint = endpoint;
        this.config.apiKey = apiKey;
    }

    /**
     * Get transmission statistics.
     */
    getStats() {
        return {
            ...this.stats,
            bufferSize: this.buffer.length,
            failedBatchCount: this.failedBatches.length,
            eventsThisMinute: this.eventsSentThisMinute,
        };
    }

    /**
     * Stop the transmitter and flush remaining events.
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.rateLimitResetTimer) {
            clearInterval(this.rateLimitResetTimer);
            this.rateLimitResetTimer = null;
        }
        await this.flush();
        await this.persistFailedBatches();
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async generateDeviceFingerprint(): Promise<string> {
        // MV3 service workers have no DOM — avoid screen, document, window.
        const components = [
            'ghost-ext',
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            String(navigator?.language ?? 'en'),
            String(navigator?.hardwareConcurrency ?? 0),
        ];
        const data = components.join('|');
        const encoder = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        const hashArray = Array.from(new Uint8Array(hash));
        return hashArray
            .slice(0, 16)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
