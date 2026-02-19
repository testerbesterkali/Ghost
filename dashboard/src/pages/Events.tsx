import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Zap, RefreshCw } from 'lucide-react';

const EVENT_TYPES = ['all', 'dom_mut', 'user_int', 'network', 'error'];

export default function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadEvents();
        const channel = supabase
            .channel('events-live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'secure_events' }, (payload) => {
                setEvents((prev) => [payload.new, ...prev].slice(0, 100));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    async function loadEvents() {
        setLoading(true);
        let query = supabase.from('secure_events').select('*').order('ingested_at', { ascending: false }).limit(100);
        if (filter !== 'all') query = query.eq('event_type', filter);
        const { data } = await query;
        setEvents(data || []);
        setLoading(false);
    }

    useEffect(() => { loadEvents(); }, [filter]);

    const filtered = filter === 'all' ? events : events.filter((e) => e.event_type === filter);

    return (
        <div>
            <div className="page-header">
                <h1>Live Events</h1>
                <div className="page-header-actions">
                    <span className="badge badge-running">{events.length} loaded</span>
                    <button className="btn btn-secondary btn-sm" onClick={loadEvents}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            <div className="filters">
                {EVENT_TYPES.map((t) => (
                    <button
                        key={t}
                        className={`filter-chip${filter === t ? ' active' : ''}`}
                        onClick={() => setFilter(t)}
                    >
                        {t === 'all' ? 'All Types' : t}
                    </button>
                ))}
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><p>Loading events...</p></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <Zap />
                        <h3>No events captured</h3>
                        <p>Browse with Ghost Shadow active to start capturing events</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Intent</th>
                                    <th>Confidence</th>
                                    <th>Session</th>
                                    <th>Batch</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((evt) => (
                                    <tr key={evt.id}>
                                        <td><span className={`badge badge-${evt.event_type === 'error' ? 'error' : 'active'}`}>{evt.event_type}</span></td>
                                        <td style={{ fontWeight: 500 }}>{evt.intent_label}</td>
                                        <td>
                                            <div className="flex-center">
                                                <div className="confidence-bar">
                                                    <div
                                                        className={`confidence-fill ${evt.intent_confidence >= 0.8 ? 'high' : evt.intent_confidence >= 0.5 ? 'medium' : 'low'}`}
                                                        style={{ width: `${evt.intent_confidence * 100}%` }}
                                                    />
                                                </div>
                                                <span className="mono">{(evt.intent_confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="mono truncate" style={{ maxWidth: 120 }}>{evt.session_fingerprint?.slice(0, 12)}...</td>
                                        <td className="mono truncate" style={{ maxWidth: 100 }}>{evt.batch_id?.slice(0, 8)}</td>
                                        <td className="mono text-muted">{timeAgo(evt.ingested_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
