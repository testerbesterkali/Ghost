import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X, CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';

export interface Notification {
    id: string;
    type: 'pattern' | 'execution' | 'approval' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Listen for new patterns
        const patternChannel = supabase
            .channel('notif-patterns')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'detected_patterns' }, (payload) => {
                const p = payload.new as any;
                addNotification({
                    type: 'pattern',
                    title: 'New Pattern Detected',
                    message: `"${p.suggested_name || 'Unnamed'}" — ${(p.confidence * 100).toFixed(0)}% confidence`,
                });
            })
            .subscribe();

        // Listen for new executions
        const execChannel = supabase
            .channel('notif-executions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'executions' }, (payload) => {
                const e = payload.new as any;
                addNotification({
                    type: 'execution',
                    title: 'Ghost Executing',
                    message: `Execution started with trigger: ${e.trigger}`,
                });
            })
            .subscribe();

        // Listen for execution status changes
        const execUpdateChannel = supabase
            .channel('notif-exec-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executions' }, (payload) => {
                const e = payload.new as any;
                if (e.status === 'completed' || e.status === 'failed') {
                    addNotification({
                        type: e.status === 'completed' ? 'info' : 'error',
                        title: `Execution ${e.status}`,
                        message: `Ghost execution finished — ${e.step_count} steps`,
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(patternChannel);
            supabase.removeChannel(execChannel);
            supabase.removeChannel(execUpdateChannel);
        };
    }, []);

    const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        setNotifications((prev) => [
            {
                ...n,
                id: crypto.randomUUID(),
                timestamp: new Date(),
                read: false,
            },
            ...prev,
        ].slice(0, 50));
    }, []);

    const markRead = useCallback((id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return { notifications, unreadCount, markRead, markAllRead, dismiss, addNotification };
}

export function NotificationPanel({
    notifications,
    onDismiss,
    onMarkAllRead,
    onClose,
}: {
    notifications: Notification[];
    onDismiss: (id: string) => void;
    onMarkAllRead: () => void;
    onClose: () => void;
}) {
    const iconMap = {
        pattern: <Sparkles size={14} />,
        execution: <CheckCircle size={14} />,
        approval: <Bell size={14} />,
        error: <AlertTriangle size={14} />,
        info: <Info size={14} />,
    };

    const colorMap = {
        pattern: 'var(--info)',
        execution: 'var(--success)',
        approval: 'var(--accent)',
        error: 'var(--error)',
        info: 'var(--text-secondary)',
    };

    return (
        <div style={{
            position: 'absolute',
            top: 'var(--header-height)',
            right: 20,
            width: 380,
            maxHeight: 500,
            background: 'rgba(16, 12, 8, 0.97)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            zIndex: 100,
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
            }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Notifications</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onMarkAllRead}>Mark all read</button>
                    <button className="btn-icon" onClick={onClose}><X size={14} /></button>
                </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            style={{
                                display: 'flex',
                                gap: 12,
                                padding: '12px 18px',
                                borderBottom: '1px solid var(--border)',
                                background: n.read ? 'transparent' : 'rgba(242, 122, 26, 0.03)',
                                transition: 'background 0.2s',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget.style.background = 'var(--bg-glass)'); }}
                            onMouseLeave={(e) => { (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(242, 122, 26, 0.03)'); }}
                        >
                            <div style={{ color: colorMap[n.type], marginTop: 2 }}>{iconMap[n.type]}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)' }}>
                                    {n.title}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    {n.message}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {timeAgo(n.timestamp)}
                                </div>
                            </div>
                            <button
                                className="btn-icon"
                                style={{ alignSelf: 'center', opacity: 0.5 }}
                                onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function timeAgo(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}
