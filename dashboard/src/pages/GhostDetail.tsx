import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Bot, Play, Pause, Trash2, CheckCircle,
    Code, Zap, TrendingUp, History
} from 'lucide-react';

export default function GhostDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ghost, setGhost] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [executions, setExecutions] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'plan' | 'versions' | 'executions' | 'feedback'>('plan');

    useEffect(() => {
        if (id) loadAll();
    }, [id]);

    async function loadAll() {
        setLoading(true);
        const [g, v, e, f] = await Promise.all([
            supabase.from('ghosts').select('*').eq('id', id).single(),
            supabase.from('ghost_versions').select('*').eq('ghost_id', id).order('version', { ascending: false }),
            supabase.from('executions').select('*').eq('ghost_id', id).order('started_at', { ascending: false }).limit(20),
            supabase.from('user_feedback').select('*').eq('ghost_id', id).order('created_at', { ascending: false }),
        ]);
        setGhost(g.data);
        setVersions(v.data || []);
        setExecutions(e.data || []);
        setFeedback(f.data || []);
        setLoading(false);
    }

    async function handleAction(action: string) {
        await supabase.functions.invoke('approve-ghost', {
            body: { ghost_id: id, action, approved_by: 'dashboard_user' },
        });
        loadAll();
    }

    async function runTest() {
        const { data, error } = await supabase.functions.invoke('ghost-executor', {
            body: { ghostId: id, parameters: ghost.parameters || {}, trigger: 'manual' },
        });

        if (error) {
            console.error('Execution failed:', error);
        } else {
            console.log('Execution started:', data);
            setActiveTab('executions');
        }
        loadAll();
    }

    if (loading) return <div className="empty-state"><p>Loading ghost...</p></div>;
    if (!ghost) return <div className="empty-state"><Bot /><h3>Ghost not found</h3></div>;

    const successRate = executions.length > 0
        ? Math.round((executions.filter((ex) => ex.status === 'completed').length / executions.length) * 100)
        : 0;

    const avgSatisfaction = feedback.length > 0
        ? (feedback.reduce((s, fb) => s + (fb.satisfaction_score || 0), 0) / feedback.length).toFixed(1)
        : '—';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <button className="btn-icon" onClick={() => navigate('/ghosts')}>
                    <ArrowLeft size={16} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{ghost.name}</h1>
                    {ghost.description && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {ghost.description}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {ghost.status === 'pending_approval' && (
                        <button className="btn btn-primary" onClick={() => handleAction('approve')}>
                            <CheckCircle size={14} /> Approve
                        </button>
                    )}
                    {(ghost.status === 'approved' || ghost.status === 'active') && (
                        <button className="btn btn-primary" onClick={runTest}>
                            <Play size={14} /> Run Test
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => handleAction(ghost.is_active ? 'pause' : 'activate')}>
                        {ghost.is_active ? <Pause size={14} /> : <Play size={14} />}
                        {ghost.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { handleAction('archive'); navigate('/ghosts'); }}>
                        <Trash2 size={14} /> Archive
                    </button>
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                <div className="card stat-card">
                    <div className="stat-icon orange"><Bot size={18} /></div>
                    <div className="stat-value">v{ghost.version}</div>
                    <div className="stat-label">Version</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon blue"><TrendingUp size={18} /></div>
                    <div className="stat-value">{(ghost.confidence * 100).toFixed(0)}%</div>
                    <div className="stat-label">Confidence</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon green"><Zap size={18} /></div>
                    <div className="stat-value">{successRate}%</div>
                    <div className="stat-label">Success Rate</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon red"><History size={18} /></div>
                    <div className="stat-value">{avgSatisfaction}</div>
                    <div className="stat-label">Avg. Rating</div>
                </div>
            </div>

            <div className="filters" style={{ marginBottom: 18 }}>
                {(['plan', 'versions', 'executions', 'feedback'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={"filter-chip" + (activeTab === tab ? ' active' : '')}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'plan' ? 'Execution Plan' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({
                            tab === 'versions' ? versions.length :
                                tab === 'executions' ? executions.length :
                                    tab === 'feedback' ? feedback.length : '—'
                        })
                    </button>
                ))}
            </div>

            {activeTab === 'plan' && (
                <div className="card card-accent">
                    <div className="card-header">
                        <div className="card-title flex-center"><Code size={16} /> Execution Plan</div>
                    </div>
                    {ghost.execution_plan ? (
                        <pre style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 16,
                            overflow: 'auto',
                            fontSize: 12,
                            fontFamily: "'SF Mono', monospace",
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            maxHeight: 400,
                            border: '1px solid var(--border)',
                        }}>
                            {JSON.stringify(ghost.execution_plan, null, 2)}
                        </pre>
                    ) : (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <Code /><p>No execution plan defined yet</p>
                        </div>
                    )}
                    {ghost.trigger && (
                        <div style={{ marginTop: 16 }}>
                            <div className="card-title" style={{ fontSize: 13, marginBottom: 8 }}>Trigger Configuration</div>
                            <pre style={{
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                padding: 12,
                                overflow: 'auto',
                                fontSize: 12,
                                fontFamily: "'SF Mono', monospace",
                                color: 'var(--accent)',
                                border: '1px solid var(--border)',
                            }}>
                                {JSON.stringify(ghost.trigger, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'versions' && (
                <div className="card">
                    {versions.length === 0 ? (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <History /><p>No version history yet</p>
                        </div>
                    ) : (
                        <div className="timeline">
                            {versions.map((v) => (
                                <div key={v.id} className="timeline-item">
                                    <div className="timeline-dot completed" />
                                    <div className="timeline-content">
                                        <div className="timeline-title">Version {v.version}</div>
                                        <div className="timeline-meta">
                                            {v.change_description || 'No description'} · by {v.created_by} · {new Date(v.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'executions' && (
                <div className="card">
                    {executions.length === 0 ? (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <Play /><p>No executions recorded</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Status</th><th>Steps</th><th>Trigger</th><th>Duration</th><th>Started</th></tr></thead>
                                <tbody>
                                    {executions.map((ex) => (
                                        <tr key={ex.id}>
                                            <td><span className={"badge badge-" + ex.status}>{ex.status}</span></td>
                                            <td className="mono">{ex.step_count}</td>
                                            <td><span className="badge badge-pending" style={{ fontSize: 10 }}>{ex.trigger}</span></td>
                                            <td className="mono">{ex.completed_at ? Math.round((new Date(ex.completed_at).getTime() - new Date(ex.started_at).getTime()) / 1000) + 's' : '—'}</td>
                                            <td className="mono text-muted">{new Date(ex.started_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'feedback' && (
                <div className="card">
                    {feedback.length === 0 ? (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <CheckCircle /><p>No feedback submitted</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {feedback.map((fb) => (
                                <div key={fb.id} style={{
                                    padding: 14,
                                    background: 'var(--bg-glass)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div className="flex-center" style={{ justifyContent: 'space-between' }}>
                                        <div>
                                            <span className="mono text-muted">{fb.satisfaction_score}/5</span>
                                        </div>
                                        <span className="mono text-muted">{new Date(fb.created_at).toLocaleString()}</span>
                                    </div>
                                    {fb.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{fb.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
