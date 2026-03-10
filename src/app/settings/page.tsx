'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getTrades, getJournalEntries, saveTrade, saveJournalEntry, deleteTrade, deleteJournalEntry } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [tradeCount, setTradeCount] = useState(0);
    const [journalCount, setJournalCount] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setMounted(true);
        if (user) {
            Promise.all([getTrades(user.uid), getJournalEntries(user.uid)]).then(([trades, journals]) => {
                setTradeCount(trades.length);
                setJournalCount(journals.length);
            });
        }
    }, [user]);

    if (!mounted) return null;

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const exportData = async () => {
        if (!user) return;
        try {
            const [trades, journal] = await Promise.all([getTrades(user.uid), getJournalEntries(user.uid)]);
            const data = {
                trades,
                journal,
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
        } catch (error) {
            showToast('Failed to export data', 'error');
        }
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (!user) return;
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    let migratedTrades = 0;
                    let migratedJournals = 0;

                    if (data.trades) {
                        for (const trade of data.trades) {
                            await saveTrade(user.uid, trade);
                        }
                        migratedTrades = data.trades.length;
                    }
                    if (data.journal) {
                        for (const journal of data.journal) {
                            await saveJournalEntry(user.uid, journal);
                        }
                        migratedJournals = data.journal.length;
                    }
                    setTradeCount(prev => prev + migratedTrades);
                    setJournalCount(prev => prev + migratedJournals);
                    showToast('Data imported successfully!', 'success');
                } catch {
                    showToast('Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const clearAllData = async () => {
        if (!user) return;
        if (confirm('⚠️ This will permanently delete ALL your trades and journal entries. Are you sure?')) {
            if (confirm('Are you REALLY sure? This cannot be undone.')) {
                try {
                    showToast('Deleting data... Please wait.', 'success');
                    const [trades, journals] = await Promise.all([getTrades(user.uid), getJournalEntries(user.uid)]);
                    for (const trade of trades) { await deleteTrade(user.uid, trade.id); }
                    for (const journal of journals) { await deleteJournalEntry(user.uid, journal.id); }
                    setTradeCount(0);
                    setJournalCount(0);
                    showToast('All data cleared successfully', 'success');
                } catch (error) {
                    showToast('Failed to clear data', 'error');
                }
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
                        <div className="grid-2">
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
