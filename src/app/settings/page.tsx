'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getTrades, getJournalEntries } from '@/lib/storage';

export default function SettingsPage() {
    const [mounted, setMounted] = useState(false);
    const [tradeCount, setTradeCount] = useState(0);
    const [journalCount, setJournalCount] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setMounted(true);
        setTradeCount(getTrades().length);
        setJournalCount(getJournalEntries().length);
    }, []);

    if (!mounted) return null;

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const exportData = () => {
        const data = {
            trades: getTrades(),
            journal: getJournalEntries(),
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monstah-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully!', 'success');
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    if (data.trades) {
                        localStorage.setItem('monstah_trades', JSON.stringify(data.trades));
                    }
                    if (data.journal) {
                        localStorage.setItem('monstah_journal', JSON.stringify(data.journal));
                    }
                    setTradeCount(data.trades?.length ?? 0);
                    setJournalCount(data.journal?.length ?? 0);
                    showToast('Data imported successfully!', 'success');
                } catch {
                    showToast('Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const clearAllData = () => {
        if (confirm('⚠️ This will permanently delete ALL your trades and journal entries. Are you sure?')) {
            if (confirm('Are you REALLY sure? This cannot be undone.')) {
                localStorage.removeItem('monstah_trades');
                localStorage.removeItem('monstah_journal');
                localStorage.removeItem('monstah_playbooks');
                setTradeCount(0);
                setJournalCount(0);
                showToast('All data cleared', 'success');
            }
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h2>Settings</h2>
                    <p>Manage your account and data</p>
                </div>

                <div className="page-body" style={{ maxWidth: '700px' }}>
                    {/* Data Overview */}
                    <div className="card mb-24">
                        <div className="card-header">
                            <span className="card-title">📊 Data Overview</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{tradeCount}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Trades</div>
                            </div>
                            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{journalCount}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Journal Entries</div>
                            </div>
                        </div>
                    </div>

                    {/* Import / Export */}
                    <div className="card mb-24">
                        <div className="card-header">
                            <span className="card-title">💾 Import & Export</span>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                            Export your data as JSON for backup, or import data from a previous export.
                        </p>
                        <div className="flex gap-16">
                            <button className="btn btn-primary" onClick={exportData}>
                                📥 Export All Data
                            </button>
                            <button className="btn btn-secondary" onClick={importData}>
                                📤 Import Data
                            </button>
                        </div>
                    </div>

                    {/* About */}
                    <div className="card mb-24">
                        <div className="card-header">
                            <span className="card-title">ℹ️ About</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                            <p><strong>Monstah Trading Journal</strong> v1.0.0</p>
                            <p className="text-muted">
                                A free, AI-powered trading journal built to help you track trades,
                                analyze performance, and improve your trading through intelligent insights.
                            </p>
                            <ul style={{ marginTop: '12px', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                <li>📊 Advanced performance analytics</li>
                                <li>🤖 AI-powered trading coach (GPT-4o)</li>
                                <li>🧠 Psychology & emotion tracking</li>
                                <li>📈 Equity curves, heatmaps & radar charts</li>
                                <li>📝 Daily trading journal</li>
                                <li>💾 Data export/import</li>
                                <li>🔒 All data stored locally in your browser</li>
                            </ul>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="card" style={{ border: '1px solid rgba(255, 82, 82, 0.2)' }}>
                        <div className="card-header">
                            <span className="card-title" style={{ color: 'var(--loss)' }}>⚠️ Danger Zone</span>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                            Permanently delete all your trades and journal entries. This action cannot be undone.
                        </p>
                        <button className="btn btn-danger" onClick={clearAllData}>
                            🗑️ Delete All Data
                        </button>
                    </div>
                </div>

                {toast && (
                    <div className={`toast ${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </main>
        </div>
    );
}
