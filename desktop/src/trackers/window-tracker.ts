import { EventTransmitter } from '../transport/transmitter';

interface WindowInfo {
    title: string;
    owner: { name: string };
    bounds: { x: number; y: number; width: number; height: number };
    url?: string;
}

interface TrackerStats {
    events: number;
    apps: string[];
    uptime: number;
}

export class WindowTracker {
    private transmitter: EventTransmitter;
    private interval: NodeJS.Timeout | null = null;
    private pollMs = 2000;
    private eventCount = 0;
    private startTime = 0;
    private appSet = new Set<string>();
    private lastWindow: string = '';

    constructor(transmitter: EventTransmitter) {
        this.transmitter = transmitter;
    }

    start() {
        this.startTime = Date.now();
        this.eventCount = 0;
        this.appSet.clear();

        this.interval = setInterval(() => this.poll(), this.pollMs);
        this.poll(); // immediate first poll
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    getStats(): TrackerStats {
        return {
            events: this.eventCount,
            apps: Array.from(this.appSet),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
        };
    }

    private async poll() {
        try {
            // Dynamic import for ESM-only module
            const activeWin = await import('active-win');
            const win = await activeWin.default();

            if (!win) return;

            const windowKey = `${win.owner.name}::${win.title}`;
            if (windowKey === this.lastWindow) return; // No change

            this.lastWindow = windowKey;
            this.appSet.add(win.owner.name);
            this.eventCount++;

            // Send to Supabase via transmitter
            await this.transmitter.send({
                eventType: 'app_switch',
                timestampBucket: new Date().toISOString(),
                sessionFingerprint: this.transmitter.sessionId,
                metadata: {
                    app: win.owner.name,
                    title: win.title,
                    url: (win as any).url || null,
                },
                intentLabel: 'navigation',
                intentConfidence: 1.0,
                intentVector: new Array(128).fill(0), // Placeholder
                structuralHash: 'desktop-win-switch',
                sequenceNumber: this.eventCount,
            });
        } catch (err) {
            // active-win may fail on some platforms or permissions
            console.error('[WindowTracker] poll error:', err);
        }
    }
}
