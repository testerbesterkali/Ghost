import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = 'https://oocvlgwpirjutrfcaxoh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vY3ZsZ3dwaXJqdXRyZmNheG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDcyODUsImV4cCI6MjA4NzA4MzI4NX0.mCK8tFeAknDtGOE--jilswtsvdy4F8hoYK0dVx_XwNc';

export class EventTransmitter {
    private supabase: SupabaseClient;
    public sessionId: string;
    private buffer: any[] = [];
    private flushInterval: NodeJS.Timeout;

    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.sessionId = crypto.randomUUID();
        this.flushInterval = setInterval(() => this.flush(), 5000);
    }

    async send(event: any) {
        this.buffer.push({
            ...event,
            device_fingerprint: this.getDeviceFingerprint(),
            org_id: 'default',
            source: 'desktop_agent',
        });

        // Flush if buffer is getting large
        if (this.buffer.length >= 10) {
            await this.flush();
        }
    }

    private async flush() {
        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        try {
            await this.supabase.functions.invoke('ingest-events', {
                body: { events: batch },
            });
        } catch (err) {
            // Put failed events back
            this.buffer.unshift(...batch);
            console.error('[Transmitter] flush error:', err);
        }
    }

    private getDeviceFingerprint(): string {
        const os = require('os');
        const data = [
            'ghost-desktop',
            os.hostname(),
            os.platform(),
            os.arch(),
            String(os.cpus().length),
        ].join('|');
        return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
    }

    destroy() {
        clearInterval(this.flushInterval);
        this.flush(); // Final flush
    }
}
