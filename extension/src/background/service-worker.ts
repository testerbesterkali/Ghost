/**
 * Service Worker — Background processing, privacy pipeline, batch transmission.
 * PRD §3.1.1 + §3.2: Receives RawEvents from content scripts,
 * runs through privacy pipeline, batches and transmits SecureEvents.
 */

import { RawEvent } from '../types/raw-event';
import { PrivacyPipeline } from '../privacy/pipeline';
import { EventTransmitter } from '../transport/event-transmitter';
import { PiiScrubber } from '../privacy/pii-scrubber';

// --- State ---
let pipeline: PrivacyPipeline | null = null;
let transmitter: EventTransmitter | null = null;
let isEnabled: boolean = true;

// Stats
let totalEventsReceived = 0;
let totalEventsProcessed = 0;

/**
 * Initialize the service worker.
 */
async function initialize(): Promise<void> {
    // Load config from storage
    const config = await getConfig();
    isEnabled = config.enabled;

    // Initialize privacy pipeline
    pipeline = new PrivacyPipeline(
        config.orgId || 'default_org',
        config.deviceId || await generateDeviceId(),
        config.userId || 'anonymous',
    );

    // Initialize transmitter
    transmitter = new EventTransmitter({
        endpoint: config.endpoint || '',
        apiKey: config.apiKey || '',
        maxBatchSize: 100,
        flushIntervalMs: 10000,
        maxRetries: 3,
        retryBaseMs: 1000,
    });

    await transmitter.initialize();

    console.log('[Ghost] Service worker initialized');
}

/**
 * Process a RawEvent through the privacy pipeline and queue for transmission.
 */
async function processEvent(event: RawEvent): Promise<void> {
    if (!isEnabled || !pipeline || !transmitter) return;

    totalEventsReceived++;

    try {
        // Run through privacy pipeline (PII scrub → intent encode → differential privacy)
        const secureEvent = await pipeline.process(event);

        // Queue for batch transmission
        transmitter.enqueue(secureEvent);

        totalEventsProcessed++;
    } catch (error) {
        console.error('[Ghost] Event processing error:', error);
    }
}

// --- Message handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'RAW_EVENT':
            processEvent(message.event);
            break;

        case 'CONTENT_SCRIPT_READY':
            console.log(
                `[Ghost] Content script active: ${message.url} (tab: ${message.tabId})`,
            );
            break;

        case 'SESSION_ROTATED':
            // Reset PII counters on session rotation
            PiiScrubber.resetCounters();
            if (pipeline) {
                pipeline.reset();
            }
            break;

        case 'GET_STATS':
            sendResponse({
                totalEventsReceived,
                totalEventsProcessed,
                transmitterStats: transmitter?.getStats(),
                isEnabled,
            });
            return true; // Keep channel open for async response

        case 'UPDATE_CONFIG':
            handleConfigUpdate(message.config);
            sendResponse({ ok: true });
            return true;

        case 'TOGGLE_ENABLED':
            isEnabled = message.enabled;
            chrome.storage.local.set({ ghost_enabled: isEnabled });
            // Broadcast to all content scripts
            broadcastToContentScripts({ type: 'TOGGLE_CAPTURE', enabled: isEnabled });
            sendResponse({ ok: true });
            return true;

        case 'FORCE_FLUSH':
            transmitter?.flush().then(() => {
                sendResponse({ ok: true, stats: transmitter?.getStats() });
            });
            return true;
    }
});

/**
 * Handle config updates from popup.
 */
async function handleConfigUpdate(config: any): Promise<void> {
    if (config.endpoint || config.apiKey) {
        transmitter?.configure(config.endpoint || '', config.apiKey || '');
    }

    if (config.orgId || config.userId) {
        pipeline = new PrivacyPipeline(
            config.orgId || 'default_org',
            config.deviceId || await generateDeviceId(),
            config.userId || 'anonymous',
        );
    }

    // Persist config
    await chrome.storage.local.set({
        ghost_config: config,
        ghost_enabled: config.enabled ?? isEnabled,
    });
}

/**
 * Broadcast a message to all active content scripts.
 */
function broadcastToContentScripts(message: any): void {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {
                    // Tab might not have content script
                });
            }
        }
    });
}

/**
 * Load configuration from chrome.storage.
 */
async function getConfig(): Promise<{
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    orgId: string;
    userId: string;
    deviceId: string;
}> {
    return new Promise((resolve) => {
        chrome.storage.local.get(
            ['ghost_config', 'ghost_enabled', 'ghost_device_id'],
            (result) => {
                const config = result.ghost_config || {};
                resolve({
                    enabled: result.ghost_enabled !== false,
                    endpoint: config.endpoint || '',
                    apiKey: config.apiKey || '',
                    orgId: config.orgId || '',
                    userId: config.userId || '',
                    deviceId: result.ghost_device_id || '',
                });
            },
        );
    });
}

/**
 * Generate and persist a device ID.
 */
async function generateDeviceId(): Promise<string> {
    const result = await chrome.storage.local.get('ghost_device_id');
    if (result.ghost_device_id) return result.ghost_device_id;

    const id = crypto.randomUUID();
    await chrome.storage.local.set({ ghost_device_id: id });
    return id;
}

// --- Lifecycle ---

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
    initialize();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
    initialize();
});

// Keep-alive alarm (Manifest V3 service workers can be terminated)
chrome.alarms.create('ghost-keepalive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'ghost-keepalive') {
        // Flush any pending events
        transmitter?.flush();
    }
});

// Initialize immediately
initialize();
