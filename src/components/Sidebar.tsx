'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'New Trade', href: '/trades/new', icon: '➕' },
    { label: 'Trades', href: '/trades', icon: '📋' },
    { label: 'Analytics', href: '/analytics', icon: '📈' },
    { label: 'Journal', href: '/journal', icon: '📝' },
];

const secondaryItems = [
    { label: 'AI Coach', href: '/ai-coach', icon: '🤖' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            <div
                className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🔥</div>
                    <div>
                        <h1 className="logo-shimmer">MONSTAH!!!</h1>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '2px', marginTop: '-1px' }}>TRADING JOURNAL</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <span className="sidebar-section-label">Trading</span>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <span className="sidebar-section-label">Tools</span>
                    {secondaryItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'var(--accent-gradient)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                            }}>
                                👤
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Trader</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pro Account</div>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="btn btn-ghost btn-sm"
                            title="Sign Out"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
