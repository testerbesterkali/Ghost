import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Executions() {
    const [executions, setExecutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);
    const [steps, setSteps] = useState<any[]>([]);

    useEffect(() => { loadExecutions(); }, []);

    async function loadExecutions() {
        setLoading(true);
        const { data } = await supabase
            .from('executions')
            .select('*, ghosts(name)')
            .order('started_at', { ascending: false })
            .limit(50);
        setExecutions(data || []);
        setLoading(false);
    }

    async function loadSteps(executionId: string) {
        setSelected(executionId);
        const { data } = await supabase
            .from('execution_steps')
            .select('*')
            .eq('execution_id', executionId)
            .order('created_at', { ascending: true });
        setSteps(data || []);
    }

    const statusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} className="text-success" />;
            case 'failed': return <XCircle size={14} className="text-error" />;
            case 'running': return <Play size={14} className="text-accent" />;
            default: return <Clock size={14} className="text-muted" />;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Executions</h1>
                <span className="badge badge-running">{executions.length} records</span>
            </div>

            <div className="content-grid">
                {/* Execution List */}
                <div className="card">
                    {loading ? (
                        <div className="empty-state"><p>Loading...</p></div>
                    ) : executions.length === 0 ? (
                        <div className="empty-state">
                            <Play />
                            <h3>No executions yet</h3>
                            <p>Execute a ghost to see results here</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ghost</th>
                                        <th>Status</th>
                                        <th>Steps</th>
                                        <th>Trigger</th>
                                        <th>Started</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {executions.map((exec) => (
                                        <tr
                                            key={exec.id}
                                            onClick={() => loadSteps(exec.id)}
                                            style={{ cursor: 'pointer', background: selected === exec.id ? 'var(--bg-glass)' : undefined }}
                                        >
                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {exec.ghosts?.name || exec.ghost_id?.slice(0, 8)}
                                            </td>
                                            <td>
                                                <div className="flex-center">
                                                    {statusIcon(exec.status)}
                                                    <span className={`badge badge-${exec.status}`}>{exec.status}</span>
                                                </div>
                                            </td>
                                            <td className="mono">{exec.step_count}</td>
                                            <td className="badge badge-pending" style={{ fontSize: 10 }}>{exec.trigger}</td>
                                            <td className="mono text-muted">{new Date(exec.started_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Step Detail */}
                <div className="card card-accent">
                    <div className="card-header">
                        <div className="card-title">Execution Trace</div>
                    </div>
                    {!selected ? (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <Clock />
                            <p>Select an execution to view steps</p>
                        </div>
                    ) : steps.length === 0 ? (
                        <div className="empty-state" style={{ padding: 30 }}>
                            <p>No steps recorded</p>
                        </div>
                    ) : (
                        <div className="timeline">
                            {steps.map((step) => (
                                <div key={step.id} className="timeline-item">
                                    <div className={`timeline-dot ${step.status}`} />
                                    <div className="timeline-content">
                                        <div className="timeline-title">{step.node_id}</div>
                                        <div className="timeline-meta">
                                            Strategy: {step.strategy} · {step.duration_ms}ms
                                        </div>
                                        {step.error && (
                                            <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>
                                                ⚠ {step.error}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
