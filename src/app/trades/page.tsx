'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getTrades, deleteTrade } from '@/lib/storage';
import { Trade, AssetClass, TradeSetup } from '@/types/trade';
import Link from 'next/link';

export default function TradesPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [mounted, setMounted] = useState(false);
    const [filterAsset, setFilterAsset] = useState<AssetClass | 'all'>('all');
    const [filterSetup, setFilterSetup] = useState<TradeSetup | 'all'>('all');
    const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss'>('all');
    const [searchSymbol, setSearchSymbol] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'symbol'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setMounted(true);
        setTrades(getTrades());
    }, []);

    if (!mounted) return null;

    const filtered = trades
        .filter(t => filterAsset === 'all' || t.assetClass === filterAsset)
        .filter(t => filterSetup === 'all' || t.setup === filterSetup)
        .filter(t => {
            if (filterResult === 'win') return (t.pnl ?? 0) > 0;
            if (filterResult === 'loss') return (t.pnl ?? 0) < 0;
            return true;
        })
        .filter(t => !searchSymbol || t.symbol.toLowerCase().includes(searchSymbol.toLowerCase()))
        .sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            if (sortBy === 'date') return a.date.localeCompare(b.date) * dir;
            if (sortBy === 'pnl') return ((a.pnl ?? 0) - (b.pnl ?? 0)) * dir;
            return a.symbol.localeCompare(b.symbol) * dir;
        });

    const totalPnl = filtered.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const winCount = filtered.filter(t => (t.pnl ?? 0) > 0).length;
    const closedCount = filtered.filter(t => t.status === 'closed').length;

    const handleDelete = (id: string) => {
        if (confirm('Delete this trade?')) {
            deleteTrade(id);
            setTrades(getTrades());
            setToast({ message: 'Trade deleted', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSort = (field: 'date' | 'pnl' | 'symbol') => {
        if (sortBy === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header flex justify-between items-center">
                    <div>
                        <h2>Trade Log</h2>
                        <p>{filtered.length} trades &middot; P&amp;L: <span className={totalPnl >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 700 }}>{totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}</span></p>
                    </div>
                    <Link href="/trades/new" className="btn btn-primary">➕ New Trade</Link>
                </div>
                <div className="page-body">
                    <div className="card mb-24" style={{ padding: '16px 20px' }}>
                        <div className="flex gap-16 items-center" style={{ flexWrap: 'wrap' }}>
                            <input className="form-input" style={{ width: '200px', padding: '8px 14px', fontSize: '0.85rem' }} placeholder="🔍 Search symbol..." value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)} />
                            <select className="form-select" style={{ width: '140px', padding: '8px 14px', fontSize: '0.85rem' }} value={filterAsset} onChange={e => setFilterAsset(e.target.value as AssetClass | 'all')}>
                                <option value="all">All Assets</option>
                                <option value="stocks">Stocks</option>
                                <option value="options">Options</option>
                                <option value="futures">Futures</option>
                                <option value="forex">Forex</option>
                                <option value="crypto">Crypto</option>
                            </select>
                            <select className="form-select" style={{ width: '160px', padding: '8px 14px', fontSize: '0.85rem' }} value={filterSetup} onChange={e => setFilterSetup(e.target.value as TradeSetup | 'all')}>
                                <option value="all">All Setups</option>
                                <option value="breakout">Breakout</option>
                                <option value="pullback">Pullback</option>
                                <option value="reversal">Reversal</option>
                                <option value="trend_following">Trend Following</option>
                                <option value="scalp">Scalp</option>
                                <option value="swing">Swing</option>
                                <option value="gap_fill">Gap Fill</option>
                                <option value="momentum">Momentum</option>
                            </select>
                            <div className="flex gap-8">
                                {(['all', 'win', 'loss'] as const).map(f => (
                                    <button key={f} className={`btn btn-sm ${filterResult === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterResult(f)}>
                                        {f === 'all' ? 'All' : f === 'win' ? '✅ Wins' : '❌ Losses'}
                                    </button>
                                ))}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
                                Win Rate: <span className={closedCount > 0 && (winCount / closedCount) * 100 >= 50 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 700 }}>{closedCount > 0 ? ((winCount / closedCount) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No trades found</h3>
                            <p>{trades.length === 0 ? 'Start logging trades to build your track record.' : 'Try adjusting your filters.'}</p>
                            {trades.length === 0 && <Link href="/trades/new" className="btn btn-primary">➕ Log Your First Trade</Link>}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>Date {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('symbol')}>Symbol {sortBy === 'symbol' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th>Dir</th>
                                        <th>Asset</th>
                                        <th>Entry</th>
                                        <th>Exit</th>
                                        <th>Qty</th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('pnl')}>P&amp;L {sortBy === 'pnl' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th>R:R</th>
                                        <th>Setup</th>
                                        <th>Status</th>
                                        <th>Emotion</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(trade => (
                                        <tr key={trade.id}>
                                            <td style={{ color: 'var(--text-secondary)' }}>{trade.date.split('T')[0]}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{trade.symbol}</td>
                                            <td><span className={`badge badge-${trade.direction}`}>{trade.direction.toUpperCase()}</span></td>
                                            <td><span className="tag">{trade.assetClass}</span></td>
                                            <td>${trade.entryPrice.toFixed(2)}</td>
                                            <td>{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}</td>
                                            <td>{trade.quantity} {trade.quantityType}</td>
                                            <td style={{ fontWeight: 700, color: trade.pnl !== null ? (trade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)') : 'var(--text-muted)' }}>
                                                {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                                            </td>
                                            <td>{trade.riskReward ? `${trade.riskReward}R` : '—'}</td>
                                            <td><span className="tag">{trade.setup.replace('_', ' ')}</span></td>
                                            <td><span className={`badge badge-${trade.status}`}>{trade.status}</span></td>
                                            <td style={{ fontSize: '1.1rem' }}>
                                                {trade.emotionBefore === 'confident' ? '😎' : trade.emotionBefore === 'fearful' ? '😰' : trade.emotionBefore === 'greedy' ? '🤑' : trade.emotionBefore === 'anxious' ? '😟' : trade.emotionBefore === 'disciplined' ? '🎯' : trade.emotionBefore === 'impulsive' ? '⚡' : trade.emotionBefore === 'calm' ? '🧘' : '😐'}
                                            </td>
                                            <td>
                                                <div className="flex gap-4">
                                                    <Link href={`/trades/new?edit=${trade.id}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>✏️</Link>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--loss)', fontSize: '0.8rem' }} onClick={() => handleDelete(trade.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</div>}
            </main>
        </div>
    );
}
