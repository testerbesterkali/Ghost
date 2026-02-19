import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Bot, Sparkles, Play, TrendingUp, Zap, Clock, AlertTriangle } from 'lucide-react';
import EventVolumeChart from '../components/EventVolumeChart';
import EventDonutChart from '../components/EventDonutChart';

interface Stats {
    totalEvents: number;
    totalPatterns: number;
    totalGhosts: number;
    totalExecutions: number;
    recentEvents: any[];
    recentPatterns: any[];
    allEvents: any[];
    eventDistribution: Array<{ name: string; value: number; color: string }>;
}

export default function Overview() {
    const [stats, setStats] = useState<Stats>({
        totalEvents: 0,
        totalPatterns: 0,
        totalGhosts: 0,
        totalExecutions: 0,
        recentEvents: [],
        recentPatterns: [],
        allEvents: [],
        eventDistribution: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
        const channel = supabase
            .channel('overview')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'secure_events' }, (payload) => {
                setStats((s) => ({
                    ...s,
                    totalEvents: s.totalEvents + 1,
                    allEvents: [payload.new, ...s.allEvents].slice(0, 500),
                    recentEvents: [payload.new, ...s.recentEvents].slice(0, 5),
                }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function loadStats() {
        try {
            const [events, patterns, ghosts, executions, recentEvts, recentPats, allEvts, distrib] = await Promise.all([
                supabase.from('secure_events').select('*', { count: 'exact', head: true }),
                supabase.from('detected_patterns').select('*', { count: 'exact', head: true }),
                supabase.from('ghosts').select('*', { count: 'exact', head: true }),
                supabase.from('executions').select('*', { count: 'exact', head: true }),
                supabase.from('secure_events').select('*').order('ingested_at', { ascending: false }).limit(5),
                supabase.from('detected_patterns').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('secure_events').select('ingested_at').order('ingested_at', { ascending: false }).limit(500),
                supabase.from('secure_events').select('event_type'),
            ]);

            // Compute event distribution from real data
            const distribMap: Record<string, number> = {};
            (distrib.data || []).forEach((e: any) => {
                distribMap[e.event_type] = (distribMap[e.event_type] || 0) + 1;
            });
            const colorMap: Record<string, string> = {
                user_int: '#f27a1a',
                dom_mut: '#42a5f5',
                network: '#4caf50',
                error: '#f44336',
            };
            const eventDistribution = Object.entries(distribMap).map(([name, value]) => ({
                name: name === 'user_int' ? 'Interaction' : name === 'dom_mut' ? 'DOM Mutation' : name.charAt(0).toUpperCase() + name.slice(1),
                value,
                color: colorMap[name] || '#ff9800',
            }));

            setStats({
                totalEvents: events.count || 0,
                totalPatterns: patterns.count || 0,
                totalGhosts: ghosts.count || 0,
                totalExecutions: executions.count || 0,
                recentEvents: recentEvts.data || [],
                recentPatterns: recentPats.data || [],
                allEvents: allEvts.data || [],
                eventDistribution,
            });
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
        setLoading(false);
    }

    return (
        <div>
            {/* Stat Cards */}
            <div className="dashboard-grid">
                <StatCard icon={<Activity />} iconClass="orange" label="Total Events" value={stats.totalEvents} change="+12%" changeDir="up" />
                <StatCard icon={<Sparkles />} iconClass="blue" label="Detected Patterns" value={stats.totalPatterns} change="+3" changeDir="up" />
                <StatCard icon={<Bot />} iconClass="green" label="Active Ghosts" value={stats.totalGhosts} change="0" changeDir="up" />
                <StatCard icon={<Play />} iconClass="red" label="Executions" value={stats.totalExecutions} change="+5" changeDir="up" />
            </div>

            {/* Event Volume Chart */}
            <div className="card" style={{ marginBottom: 18 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title">Event Volume</div>
                        <div className="card-subtitle">Events captured over time (15-min buckets)</div>
                    </div>
                    <TrendingUp size={16} className="text-accent" />
                </div>
                <EventVolumeChart events={stats.allEvents} />
            </div>

            {/* Content Grid */}
            <div className="content-grid">
                {/* Recent Events */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Recent Events</div>
                            <div className="card-subtitle">Live feed from browser extension</div>
                        </div>
                        <Zap size={16} className="text-accent" />
                    </div>
                    {loading ? (
                        <div className="empty-state"><p>Loading...</p></div>
                    ) : stats.recentEvents.length === 0 ? (
                        <div className="empty-state">
                            <Zap />
                            <h3>No events yet</h3>
                            <p>Browse with the Ghost extension active to start capturing events</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Type</th><th>Intent</th><th>Confidence</th><th>Time</th></tr>
                                </thead>
                                <tbody>
                                    {stats.recentEvents.map((evt, i) => (
                                        <tr key={i}>
                                            <td><span className="badge badge-active">{evt.event_type}</span></td>
                                            <td>{evt.intent_label}</td>
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
                                            <td className="mono text-muted">{timeAgo(evt.ingested_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* AI Assistant / Patterns Card */}
                <div className="card card-accent">
                    <div className="card-header">
                        <div>
                            <div className="card-title">AI Assistant</div>
                            <div className="card-subtitle">Pattern analysis prepared</div>
                        </div>
                        <Sparkles size={16} className="text-accent" />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <div className="flex-center" style={{ justifyContent: 'space-between' }}>
                            <span className="stat-label">Patterns Found</span>
                            <span className="badge badge-active">{stats.totalPatterns}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="stat-value animated" style={{ fontSize: 48, textAlign: 'center', margin: '16px 0' }}>
                            {stats.totalEvents > 0 ? Math.round((stats.totalPatterns / Math.max(stats.totalEvents, 1)) * 100) : 0}%
                        </div>
                        <div className="stat-label" style={{ textAlign: 'center' }}>Pattern Detection Rate</div>
                    </div>
                    {stats.recentPatterns.length > 0 && (
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {stats.recentPatterns.slice(0, 3).map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13 }}>{p.suggested_name || 'Unnamed'}</span>
                                    <span className={`badge badge-${p.status === 'auto_suggested' ? 'active' : 'needs-review'}`}>{p.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* System Health */}
            <div className="content-grid-3 mt-4">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Pipeline Status</div>
                        <Clock size={14} className="text-muted" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <PipelineStep label="Ingest Events" status="active" />
                        <PipelineStep label="Pattern Detector" status="active" />
                        <PipelineStep label="Ghost Executor" status="active" />
                        <PipelineStep label="Approve Ghost" status="active" />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Event Distribution</div>
                    </div>
                    <EventDonutChart data={stats.eventDistribution} />
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Alerts</div>
                        <AlertTriangle size={14} className="text-muted" />
                    </div>
                    <div className="empty-state" style={{ padding: 30 }}>
                        <AlertTriangle />
                        <h3>All Clear</h3>
                        <p>No alerts at this time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconClass, label, value, change, changeDir }: {
    icon: React.ReactNode; iconClass: string; label: string;
    value: number; change: string; changeDir: 'up' | 'down';
}) {
    return (
        <div className="card stat-card">
            <div className={`stat-icon ${iconClass}`}>{icon}</div>
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
            <span className={`stat-change ${changeDir}`}>
                {changeDir === 'up' ? '↑' : '↓'} {change}
            </span>
        </div>
    );
}

function PipelineStep({ label, status }: { label: string; status: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{label}</span>
            <span className={`badge badge-${status}`}>{status}</span>
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
