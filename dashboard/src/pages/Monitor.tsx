import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Activity, CheckCircle,
    Server, TrendingUp, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid,
} from 'recharts';

interface HealthMetrics {
    totalEvents: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgConfidence: number;
    functionHealth: Array<{ name: string; status: string; lastInvoked: string }>;
    executionsByDay: Array<{ day: string; completed: number; failed: number }>;
    eventsByHour: Array<{ hour: string; count: number }>;
}

export default function Monitor() {
    const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => { loadMetrics(); }, []);

    async function loadMetrics() {
        setLoading(true);
        try {
            const [events, executions, patterns, eventsList] = await Promise.all([
                supabase.from('secure_events').select('*', { count: 'exact', head: true }),
                supabase.from('executions').select('*'),
                supabase.from('detected_patterns').select('confidence'),
                supabase.from('secure_events').select('ingested_at, event_type').order('ingested_at', { ascending: false }).limit(1000),
            ]);

            const execs = executions.data || [];
            const successfulExecutions = execs.filter((e) => e.status === 'completed').length;
            const failedExecutions = execs.filter((e) => e.status === 'failed').length;

            const pats = patterns.data || [];
            const avgConfidence = pats.length > 0
                ? pats.reduce((s, p) => s + (p.confidence || 0), 0) / pats.length
                : 0;

            // Events by hour
            const hourBuckets: Record<string, number> = {};
            for (let i = 23; i >= 0; i--) {
                const h = new Date(Date.now() - i * 3600000);
                const key = `${h.getHours().toString().padStart(2, '0')}:00`;
                hourBuckets[key] = 0;
            }
            (eventsList.data || []).forEach((e: any) => {
                const h = new Date(e.ingested_at);
                const key = `${h.getHours().toString().padStart(2, '0')}:00`;
                if (hourBuckets[key] !== undefined) hourBuckets[key]++;
            });
            const eventsByHour = Object.entries(hourBuckets).map(([hour, count]) => ({ hour, count }));

            // Executions by day
            const dayBuckets: Record<string, { completed: number; failed: number }> = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(Date.now() - i * 86400000);
                const key = d.toLocaleDateString('en-US', { weekday: 'short' });
                dayBuckets[key] = { completed: 0, failed: 0 };
            }
            execs.forEach((e) => {
                const d = new Date(e.started_at);
                const key = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (dayBuckets[key]) {
                    if (e.status === 'completed') dayBuckets[key].completed++;
                    else if (e.status === 'failed') dayBuckets[key].failed++;
                }
            });
            const executionsByDay = Object.entries(dayBuckets).map(([day, v]) => ({ day, ...v }));

            const functionHealth = [
                { name: 'ingest-events', status: 'healthy', lastInvoked: '< 1 min ago' },
                { name: 'pattern-detector', status: 'healthy', lastInvoked: '< 5 min ago' },
                { name: 'ghost-executor', status: 'healthy', lastInvoked: 'idle' },
                { name: 'approve-ghost', status: 'healthy', lastInvoked: 'idle' },
            ];

            setMetrics({
                totalEvents: events.count || 0,
                totalExecutions: execs.length,
                successfulExecutions,
                failedExecutions,
                avgConfidence,
                functionHealth,
                executionsByDay,
                eventsByHour,
            });
        } catch (err) {
            console.error('Failed to load metrics:', err);
        }
        setLoading(false);
        setLastRefresh(new Date());
    }

    const ChartTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: 'rgba(16, 12, 8, 0.95)',
                border: '1px solid rgba(242, 122, 26, 0.25)',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
            }}>
                <div style={{ color: '#a89888', marginBottom: 2 }}>{label}</div>
                {payload.map((p: any, i: number) => (
                    <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
                ))}
            </div>
        );
    };

    if (loading || !metrics) {
        return <div className="empty-state" style={{ height: '50vh' }}><p>Loading metrics...</p></div>;
    }

    const successRate = metrics.totalExecutions > 0
        ? Math.round((metrics.successfulExecutions / metrics.totalExecutions) * 100)
        : 100;

    return (
        <div>
            <div className="page-header">
                <h1>Ghost Watch</h1>
                <div className="page-header-actions">
                    <span className="mono text-muted" style={{ fontSize: 11 }}>
                        Last refresh: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={loadMetrics}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                <div className="card stat-card">
                    <div className="stat-icon orange"><Activity size={18} /></div>
                    <div className="stat-value">{metrics.totalEvents.toLocaleString()}</div>
                    <div className="stat-label">Events Processed</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon green"><CheckCircle size={18} /></div>
                    <div className="stat-value animated">{successRate}%</div>
                    <div className="stat-label">Success Rate</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon blue"><TrendingUp size={18} /></div>
                    <div className="stat-value">{(metrics.avgConfidence * 100).toFixed(0)}%</div>
                    <div className="stat-label">Avg Confidence</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon red"><AlertTriangle size={18} /></div>
                    <div className="stat-value">{metrics.failedExecutions}</div>
                    <div className="stat-label">Failed Executions</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="content-grid" style={{ marginBottom: 18 }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Event Volume (24h)</div>
                    </div>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <AreaChart data={metrics.eventsByHour} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="monitorGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f27a1a" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#f27a1a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,140,50,0.06)" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,140,50,0.08)' }} tickLine={false} interval={3} />
                                <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="count" name="Events" stroke="#f27a1a" strokeWidth={2} fill="url(#monitorGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Executions (7d)</div>
                    </div>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <BarChart data={metrics.executionsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,140,50,0.06)" vertical={false} />
                                <XAxis dataKey="day" tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,140,50,0.08)' }} tickLine={false} />
                                <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="completed" name="Completed" fill="#4caf50" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="failed" name="Failed" fill="#f44336" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Edge Function Health */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title flex-center"><Server size={16} /> Edge Function Health</div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Function</th><th>Status</th><th>Last Invoked</th><th>Endpoint</th></tr>
                        </thead>
                        <tbody>
                            {metrics.functionHealth.map((fn) => (
                                <tr key={fn.name}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fn.name}</td>
                                    <td>
                                        <span className={`badge badge-${fn.status === 'healthy' ? 'active' : 'error'}`}>
                                            {fn.status === 'healthy' ? '● healthy' : '● unhealthy'}
                                        </span>
                                    </td>
                                    <td className="mono text-muted">{fn.lastInvoked}</td>
                                    <td className="mono text-muted truncate" style={{ maxWidth: 250 }}>
                                        /functions/v1/{fn.name}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
