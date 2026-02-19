import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    Ghost,
    LayoutDashboard,
    Activity,
    Sparkles,
    Bot,
    Play,
    Settings,
    Search,
    Bell,
    LogOut,
    BarChart3,
} from 'lucide-react';
import { useNotifications, NotificationPanel } from './NotificationCenter';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/events', icon: Activity, label: 'Events' },
    { to: '/patterns', icon: Sparkles, label: 'Patterns' },
    { to: '/ghosts', icon: Bot, label: 'Ghosts' },
    { to: '/executions', icon: Play, label: 'Executions' },
    { to: '/monitor', icon: BarChart3, label: 'Monitor' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/events': 'Live Events',
    '/patterns': 'Detected Patterns',
    '/ghosts': 'Ghosts',
    '/executions': 'Executions',
    '/monitor': 'Ghost Watch',
    '/settings': 'Settings',
};

export default function Layout() {
    const location = useLocation();
    const title = pageTitles[location.pathname] || 'Ghost';
    const [showNotifs, setShowNotifs] = useState(false);
    const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <Ghost />
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `sidebar-link${isActive ? ' active' : ''}`
                            }
                            title={item.label}
                        >
                            <item.icon />
                        </NavLink>
                    ))}
                </nav>

                <button className="sidebar-link" title="Sign Out">
                    <LogOut />
                </button>
            </aside>

            {/* Main */}
            <div className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <h2 className="header-title">{title}</h2>
                    </div>

                    <div className="header-search">
                        <Search />
                        <input placeholder="Search events, patterns, ghosts..." />
                    </div>

                    <div className="header-right">
                        <div style={{ position: 'relative' }}>
                            <button
                                className="header-icon-btn"
                                title="Notifications"
                                onClick={() => setShowNotifs(!showNotifs)}
                            >
                                <Bell />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                        <div className="header-avatar">G</div>
                    </div>
                </header>

                {/* Notification Panel */}
                {showNotifs && (
                    <NotificationPanel
                        notifications={notifications}
                        onDismiss={dismiss}
                        onMarkAllRead={markAllRead}
                        onClose={() => setShowNotifs(false)}
                    />
                )}

                {/* Page */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
