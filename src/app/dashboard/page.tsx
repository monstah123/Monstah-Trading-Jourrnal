'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { getTrades } from '@/lib/storage';
import { calculatePortfolioStats } from '@/lib/stats';
import { Trade, PortfolioStats } from '@/types/trade';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const EMOTION_EMOJIS: Record<string, string> = {
    confident: '😎', fearful: '😰', greedy: '🤑', neutral: '😐',
    anxious: '😟', disciplined: '🎯', impulsive: '⚡', calm: '🧘',
};

export default function Dashboard() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [stats, setStats] = useState<PortfolioStats | null>(null);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [loadingAi, setLoadingAi] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (user) {
            getTrades(user.uid).then(allTrades => {
                setTrades(allTrades);
                if (allTrades.length > 0) {
                    setStats(calculatePortfolioStats(allTrades));
                }
            });
        }
    }, [user]);

    const requestAiInsight = useCallback(async () => {
        if (trades.length === 0) return;
        setLoadingAi(true);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trades: trades.slice(-20), type: 'analyze' }),
            });
            const data = await res.json();
            setAiInsight(data.result);
        } catch {
            setAiInsight('Failed to get AI analysis. Please try again.');
        } finally {
            setLoadingAi(false);
        }
    }, [trades]);

    if (!mounted) return null;

    const recentTrades = [...trades]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    const equityCurve = stats?.dailyStats.reduce((acc: { date: string; equity: number }[], day, i) => {
        const prevEquity = i > 0 ? acc[i - 1].equity : 0;
        acc.push({ date: day.date, equity: prevEquity + day.totalPnl });
        return acc;
    }, []) ?? [];

    const pnlByDay = stats?.dailyStats.map(d => ({
        date: d.date.slice(5),
        pnl: Number(d.totalPnl.toFixed(2)),
    })) ?? [];

    const setupData = trades.reduce((acc: Record<string, number>, t) => {
        if (t.status === 'closed') {
            acc[t.setup] = (acc[t.setup] || 0) + 1;
        }
        return acc;
    }, {});
    const pieData = Object.entries(setupData).map(([name, value]) => ({ name, value }));
    const PIE_COLORS = ['#6c5ce7', '#00cec9', '#ff7675', '#fdcb6e', '#55efc4', '#a29bfe', '#fab1a0', '#81ecec'];

    const emotionData = trades.reduce((acc: Record<string, { count: number; wins: number }>, t) => {
        if (t.status === 'closed') {
            if (!acc[t.emotionBefore]) acc[t.emotionBefore] = { count: 0, wins: 0 };
            acc[t.emotionBefore].count++;
            if ((t.pnl ?? 0) > 0) acc[t.emotionBefore].wins++;
        }
        return acc;
    }, {});

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h2>Dashboard</h2>
                    <p>Your trading performance at a glance</p>
                </div>
                <div className="page-body">
                    {trades.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📊</div>
                            <h3>Welcome to Monstah!</h3>
                            <p>Start by logging your first trade to see your dashboard come alive with analytics, charts, and AI insights.</p>
                            <Link href="/trades/new" className="btn btn-primary btn-lg">➕ Log Your First Trade</Link>
                        </div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Total P&amp;L</div>
                                    <div className={`stat-value ${(stats?.totalPnl ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                                        {(stats?.totalPnl ?? 0) >= 0 ? '+' : ''}${(stats?.totalPnl ?? 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Win Rate</div>
                                    <div className={`stat-value ${(stats?.winRate ?? 0) >= 50 ? 'profit' : 'loss'}`}>
                                        {(stats?.winRate ?? 0).toFixed(1)}%
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Total Trades</div>
                                    <div className="stat-value neutral">{stats?.totalTrades ?? 0}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Profit Factor</div>
                                    <div className={`stat-value ${(stats?.profitFactor ?? 0) >= 1 ? 'profit' : 'loss'}`}>
                                        {(stats?.profitFactor ?? 0) === Infinity ? '∞' : (stats?.profitFactor ?? 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Avg Win</div>
                                    <div className="stat-value profit">+${(stats?.averageWin ?? 0).toFixed(2)}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Avg Loss</div>
                                    <div className="stat-value loss">-${(stats?.averageLoss ?? 0).toFixed(2)}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Current Streak</div>
                                    <div className={`stat-value ${(stats?.currentStreak ?? 0) >= 0 ? 'profit' : 'loss'}`}>
                                        {(stats?.currentStreak ?? 0) > 0 ? `🔥 ${stats?.currentStreak}W` : `❄️ ${Math.abs(stats?.currentStreak ?? 0)}L`}
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Sharpe Ratio</div>
                                    <div className={`stat-value ${(stats?.sharpeRatio ?? 0) >= 1 ? 'profit' : (stats?.sharpeRatio ?? 0) >= 0 ? 'neutral' : 'loss'}`}>
                                        {stats?.sharpeRatio ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="grid-2-1" style={{ marginBottom: '32px' }}>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">📈 Equity Curve</span></div>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={equityCurve}>
                                                <defs>
                                                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                                <YAxis tick={{ fill: '#55556a', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                                <Tooltip contentStyle={{ background: '#13131d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#8888a0' }} formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Equity']} />
                                                <Area type="monotone" dataKey="equity" stroke="#6c5ce7" fill="url(#equityGrad)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">🎯 Setup Distribution</span></div>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3}>
                                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ background: '#13131d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="grid-2" style={{ marginBottom: '32px' }}>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">💰 Daily P&amp;L</span></div>
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={pnlByDay}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 11 }} />
                                                <YAxis tick={{ fill: '#55556a', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                                <Tooltip contentStyle={{ background: '#13131d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value) => [`$${Number(value).toFixed(2)}`, 'P&L']} />
                                                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                    {pnlByDay.map((entry, i) => (<Cell key={i} fill={entry.pnl >= 0 ? '#00e676' : '#ff5252'} />))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">🎭 Emotion vs. Win Rate</span></div>
                                    <div style={{ padding: '10px 0' }}>
                                        {Object.entries(emotionData).map(([emotion, data]) => {
                                            const winRate = (data.wins / data.count) * 100;
                                            return (
                                                <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>
                                                    <span style={{ fontSize: '1.2rem', width: '30px' }}>{EMOTION_EMOJIS[emotion] || '❓'}</span>
                                                    <span style={{ flex: '0 0 90px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{emotion}</span>
                                                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${winRate}%`, height: '100%', background: winRate >= 50 ? 'var(--profit)' : 'var(--loss)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <span className="mono" style={{ fontSize: '0.8rem', width: '50px', textAlign: 'right', color: winRate >= 50 ? 'var(--profit)' : 'var(--loss)' }}>{winRate.toFixed(0)}%</span>
                                                    <span className="text-muted" style={{ fontSize: '0.7rem', width: '40px' }}>({data.count})</span>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(emotionData).length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>No emotional data yet</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">📋 Recent Trades</span>
                                        <Link href="/trades" className="btn btn-ghost btn-sm">View All →</Link>
                                    </div>
                                    {recentTrades.length > 0 ? (
                                        <div className="table-container">
                                            <table className="table">
                                                <thead><tr><th>Symbol</th><th>Dir</th><th>P&amp;L</th><th>Setup</th></tr></thead>
                                                <tbody>
                                                    {recentTrades.map(trade => (
                                                        <tr key={trade.id}>
                                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trade.symbol}</td>
                                                            <td><span className={`badge badge-${trade.direction}`}>{trade.direction}</span></td>
                                                            <td className={trade.pnl !== null ? (trade.pnl >= 0 ? 'text-profit' : 'text-loss') : ''}>
                                                                {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                                                            </td>
                                                            <td><span className="tag">{trade.setup}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : <p className="text-muted">No trades yet</p>}
                                </div>
                                <div className="ai-panel">
                                    <div className="ai-header">
                                        <div className="ai-dot" />
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🤖 Monstah AI Coach</span>
                                    </div>
                                    <div className="ai-messages">
                                        {!aiInsight && !loadingAi && (
                                            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧠</div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>Get AI-powered analysis of your trading performance</p>
                                                <button onClick={requestAiInsight} className="btn btn-primary" disabled={trades.length === 0}>Analyze My Trades</button>
                                            </div>
                                        )}
                                        {loadingAi && (
                                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                                <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto 16px' }} />
                                                <p className="text-muted">Analyzing your trading patterns...</p>
                                            </div>
                                        )}
                                        {aiInsight && (
                                            <div className="ai-message assistant" dangerouslySetInnerHTML={{
                                                __html: aiInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/### (.*)/g, '<h3>$1</h3>').replace(/## (.*)/g, '<h3>$1</h3>').replace(/\n/g, '<br/>')
                                            }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
