import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bot, Play, Pause, Trash2, MoreHorizontal } from 'lucide-react';

export default function Ghosts() {
    const [ghosts, setGhosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadGhosts(); }, []);

    async function loadGhosts() {
        setLoading(true);
        const { data } = await supabase.from('ghosts').select('*').order('created_at', { ascending: false });
        setGhosts(data || []);
        setLoading(false);
    }

    async function toggleActive(ghost: any) {
        const newStatus = ghost.is_active ? 'paused' : 'active';
        await supabase.from('ghosts')
            .update({ is_active: !ghost.is_active, status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', ghost.id);
        loadGhosts();
    }

    async function approveGhost(id: string) {
        await supabase.from('ghosts')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', id);
        loadGhosts();
    }

    async function deleteGhost(id: string) {
        await supabase.from('ghosts').delete().eq('id', id);
        loadGhosts();
    }

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            pending_approval: 'needs-review',
            approved: 'approved',
            active: 'active',
            paused: 'paused',
            archived: 'archived',
        };
        return `badge badge-${map[status] || 'pending'}`;
    };

    return (
        <div>
            <div className="page-header">
                <h1>Ghosts</h1>
                <span className="badge badge-active">{ghosts.filter((g) => g.is_active).length} active</span>
            </div>

            {loading ? (
                <div className="card"><div className="empty-state"><p>Loading ghosts...</p></div></div>
            ) : ghosts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Bot />
                        <h3>No ghosts created</h3>
                        <p>Approve a detected pattern to create a ghost</p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Version</th>
                                    <th>Confidence</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ghosts.map((ghost) => (
                                    <tr key={ghost.id}>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ghost.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ghost.description?.slice(0, 60) || '—'}</div>
                                            </div>
                                        </td>
                                        <td><span className={statusBadge(ghost.status)}>{ghost.status?.replace(/_/g, ' ')}</span></td>
                                        <td className="mono">v{ghost.version}</td>
                                        <td>
                                            {ghost.confidence != null ? (
                                                <div className="flex-center">
                                                    <div className="confidence-bar">
                                                        <div
                                                            className={`confidence-fill ${ghost.confidence >= 0.85 ? 'high' : ghost.confidence >= 0.7 ? 'medium' : 'low'}`}
                                                            style={{ width: `${ghost.confidence * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="mono">{(ghost.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="mono text-muted">{new Date(ghost.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {ghost.status === 'pending_approval' && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => approveGhost(ghost.id)}>
                                                        Approve
                                                    </button>
                                                )}
                                                {(ghost.status === 'approved' || ghost.status === 'active' || ghost.status === 'paused') && (
                                                    <button className="btn-icon" title={ghost.is_active ? 'Pause' : 'Activate'} onClick={() => toggleActive(ghost)}>
                                                        {ghost.is_active ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>
                                                )}
                                                <button className="btn-icon" title="Delete" onClick={() => deleteGhost(ghost.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                                <button className="btn-icon"><MoreHorizontal size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
