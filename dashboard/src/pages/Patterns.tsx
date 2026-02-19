import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle, XCircle, Eye, MoreHorizontal } from 'lucide-react';

const STATUS_FILTERS = ['all', 'needs_review', 'auto_suggested', 'approved', 'dismissed'];

export default function Patterns() {
    const [patterns, setPatterns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => { loadPatterns(); }, [filter]);

    async function loadPatterns() {
        setLoading(true);
        let query = supabase.from('detected_patterns').select('*').order('confidence', { ascending: false });
        if (filter !== 'all') query = query.eq('status', filter);
        const { data } = await query;
        setPatterns(data || []);
        setLoading(false);
    }

    async function updateStatus(id: string, status: string) {
        await supabase.from('detected_patterns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        loadPatterns();
    }

    async function approveAsGhost(pattern: any) {
        // Create ghost from pattern
        await supabase.from('ghosts').insert({
            org_id: pattern.org_id,
            name: pattern.suggested_name || 'Auto-generated Ghost',
            description: pattern.suggested_description || '',
            status: 'pending_approval',
            trigger: { type: 'event', condition: pattern.intent_sequence?.join(' → ') || '' },
            confidence: pattern.confidence,
            source_pattern_id: pattern.id,
        });
        await updateStatus(pattern.id, 'approved');
    }

    return (
        <div>
            <div className="page-header">
                <h1>Detected Patterns</h1>
                <span className="badge badge-running">{patterns.length} patterns</span>
            </div>

            <div className="filters">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        className={`filter-chip${filter === s ? ' active' : ''}`}
                        onClick={() => setFilter(s)}
                    >
                        {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="card"><div className="empty-state"><p>Loading patterns...</p></div></div>
            ) : patterns.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Sparkles />
                        <h3>No patterns detected</h3>
                        <p>Patterns appear as the AI analyzes captured events</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
                    {patterns.map((p) => (
                        <div key={p.id} className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">{p.suggested_name || 'Unnamed Pattern'}</div>
                                    <div className="card-subtitle">{p.occurrences} occurrences</div>
                                </div>
                                <button className="btn-icon"><MoreHorizontal size={14} /></button>
                            </div>

                            {p.suggested_description && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                                    {p.suggested_description}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                {(p.intent_sequence || []).slice(0, 5).map((intent: string, i: number) => (
                                    <span key={i} className="badge badge-pending" style={{ fontSize: 10 }}>{intent}</span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div className="flex-center">
                                    <span className="stat-label">Confidence</span>
                                    <div className="confidence-bar" style={{ width: 80 }}>
                                        <div
                                            className={`confidence-fill ${p.confidence >= 0.85 ? 'high' : p.confidence >= 0.7 ? 'medium' : 'low'}`}
                                            style={{ width: `${p.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="mono" style={{ fontSize: 12 }}>{(p.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <span className={`badge badge-${p.status === 'approved' ? 'approved' : p.status === 'auto_suggested' ? 'in-progress' : p.status === 'dismissed' ? 'dismissed' : 'needs-review'}`}>
                                    {p.status?.replace(/_/g, ' ')}
                                </span>
                            </div>

                            {p.status !== 'approved' && p.status !== 'dismissed' && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => approveAsGhost(p)}>
                                        <CheckCircle size={14} /> Approve Ghost
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(p.id, 'dismissed')}>
                                        <XCircle size={14} />
                                    </button>
                                    <button className="btn btn-secondary btn-sm">
                                        <Eye size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
