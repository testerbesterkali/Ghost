import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/events', icon: Activity, label: 'Events' },
    { to: '/patterns', icon: Sparkles, label: 'Patterns' },
    { to: '/ghosts', icon: Bot, label: 'Ghosts' },
    { to: '/executions', icon: Play, label: 'Executions' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/events': 'Live Events',
    '/patterns': 'Detected Patterns',
    '/ghosts': 'Ghosts',
    '/executions': 'Executions',
    '/settings': 'Settings',
};

export default function Layout() {
    const location = useLocation();
    const title = pageTitles[location.pathname] || 'Ghost';

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
                        <input placeholder="Enter your search request" />
                    </div>

                    <div className="header-right">
                        <button className="header-icon-btn" title="Notifications">
                            <Bell />
                        </button>
                        <div className="header-avatar">G</div>
                    </div>
                </header>

                {/* Page */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
