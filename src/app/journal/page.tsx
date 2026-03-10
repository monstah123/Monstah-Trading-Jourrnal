'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getJournalEntries, saveJournalEntry, getTrades, generateId } from '@/lib/storage';
import { JournalEntry, Emotion, Trade } from '@/types/trade';
import { useAuth } from '@/components/AuthProvider';

const EMOTIONS: { value: Emotion; emoji: string; label: string }[] = [
    { value: 'confident', emoji: '😎', label: 'Confident' },
    { value: 'fearful', emoji: '😰', label: 'Fearful' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
    { value: 'anxious', emoji: '😟', label: 'Anxious' },
    { value: 'disciplined', emoji: '🎯', label: 'Disciplined' },
    { value: 'calm', emoji: '🧘', label: 'Calm' },
];

export default function JournalPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [mounted, setMounted] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [aiReview, setAiReview] = useState('');
    const [loadingAi, setLoadingAi] = useState(false);

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        preMarketNotes: '',
        postMarketNotes: '',
        mood: 'neutral' as Emotion,
        lessonsLearned: '',
        goalsForTomorrow: '',
        marketConditions: '',
        overallRating: 5,
    });

    useEffect(() => {
        setMounted(true);
        if (user) {
            Promise.all([getJournalEntries(user.uid), getTrades(user.uid)]).then(([rawEntries, rawTrades]) => {
                setEntries(rawEntries.sort((a, b) => b.date.localeCompare(a.date)));
                setTrades(rawTrades);
            });
        }
    }, [user]);

    if (!mounted) return null;

    const handleChange = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!user) return;
        const dayTrades = trades.filter(t => t.date.startsWith(form.date));
        const entry: JournalEntry = {
            id: generateId(),
            date: form.date,
            preMarketNotes: form.preMarketNotes,
            postMarketNotes: form.postMarketNotes,
            mood: form.mood,
            lessonsLearned: form.lessonsLearned,
            goalsForTomorrow: form.goalsForTomorrow,
            marketConditions: form.marketConditions,
            overallRating: form.overallRating,
            trades: dayTrades.map(t => t.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveJournalEntry(user.uid, entry);
        const updatedEntries = await getJournalEntries(user.uid);
        setEntries(updatedEntries.sort((a, b) => b.date.localeCompare(a.date)));
        setShowForm(false);
        setForm({
            date: new Date().toISOString().split('T')[0],
            preMarketNotes: '', postMarketNotes: '', mood: 'neutral',
            lessonsLearned: '', goalsForTomorrow: '', marketConditions: '', overallRating: 5,
        });
    };

    const generateDailyReview = async (date: string) => {
        const dayTrades = trades.filter(t => t.date.startsWith(date));
        if (dayTrades.length === 0) return;
        setLoadingAi(true);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trades: dayTrades, type: 'daily_review' }),
            });
            const data = await res.json();
            setAiReview(data.result);
        } catch {
            setAiReview('Failed to generate review.');
        } finally {
            setLoadingAi(false);
        }
    };

    const getDatePnl = (date: string) => {
        const dayTrades = trades.filter(t => t.date.startsWith(date) && t.status === 'closed');
        return dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    };

    const getDateTradeCount = (date: string) => {
        return trades.filter(t => t.date.startsWith(date)).length;
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header flex justify-between items-center">
                    <div>
                        <h2>Trading Journal</h2>
                        <p>Reflect on your trading day, build discipline</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✕ Close' : '📝 New Entry'}
                    </button>
                </div>

                <div className="page-body">
                    {/* New Entry Form */}
                    {showForm && (
                        <div className="card mb-32" style={{ border: '1px solid var(--border-accent)' }}>
                            <div className="card-header">
                                <span className="card-title">📝 New Journal Entry</span>
                            </div>

                            <div className="form-row mb-16">
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" value={form.date}
                                        onChange={e => handleChange('date', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Market Conditions</label>
                                    <input className="form-input" placeholder="e.g. Bullish, bearish, choppy, trending..."
                                        value={form.marketConditions} onChange={e => handleChange('marketConditions', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Overall Rating: {form.overallRating}/10</label>
                                    <input type="range" min="1" max="10" className="confidence-slider" value={form.overallRating}
                                        onChange={e => handleChange('overallRating', parseInt(e.target.value))} />
                                </div>
                            </div>

                            <div className="form-group mb-16">
                                <label className="form-label">Mood</label>
                                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                                    {EMOTIONS.map(e => (
                                        <button key={e.value} type="button"
                                            className={`emotion-btn ${form.mood === e.value ? 'selected' : ''}`}
                                            style={{ width: 'auto', padding: '8px 16px' }}
                                            onClick={() => handleChange('mood', e.value)}>
                                            {e.emoji} {e.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row mb-16">
                                <div className="form-group">
                                    <label className="form-label">Pre-Market Notes</label>
                                    <textarea className="form-textarea" placeholder="What's your plan for today? Key levels to watch?"
                                        value={form.preMarketNotes} onChange={e => handleChange('preMarketNotes', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Post-Market Notes</label>
                                    <textarea className="form-textarea" placeholder="How did the day go? What happened?"
                                        value={form.postMarketNotes} onChange={e => handleChange('postMarketNotes', e.target.value)} />
                                </div>
                            </div>

                            <div className="form-row mb-16">
                                <div className="form-group">
                                    <label className="form-label">Lessons Learned</label>
                                    <textarea className="form-textarea" placeholder="What did you learn today?"
                                        value={form.lessonsLearned} onChange={e => handleChange('lessonsLearned', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Goals for Tomorrow</label>
                                    <textarea className="form-textarea" placeholder="What will you focus on?"
                                        value={form.goalsForTomorrow} onChange={e => handleChange('goalsForTomorrow', e.target.value)} />
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSave}>💾 Save Entry</button>
                            </div>
                        </div>
                    )}

                    {/* Journal Entries */}
                    {entries.length === 0 && !showForm ? (
                        <div className="empty-state">
                            <div className="empty-icon">📝</div>
                            <h3>Your journal is empty</h3>
                            <p>Journaling is one of the most powerful tools for improving as a trader. Start documenting your days.</p>
                            <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>📝 Write First Entry</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {entries.map(entry => {
                                const pnl = getDatePnl(entry.date);
                                const tradeCount = getDateTradeCount(entry.date);
                                const isSelected = selectedEntry?.id === entry.id;

                                return (
                                    <div key={entry.id} className="card" style={{ cursor: 'pointer', border: isSelected ? '1px solid var(--border-accent)' : undefined }}
                                        onClick={() => setSelectedEntry(isSelected ? null : entry)}>
                                        <div className="flex justify-between items-center mb-16">
                                            <div className="flex items-center gap-16">
                                                <div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{entry.date}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {tradeCount} trade{tradeCount !== 1 ? 's' : ''} · {entry.marketConditions || 'No conditions noted'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-16">
                                                <span style={{ fontSize: '1.3rem' }}>
                                                    {EMOTIONS.find(e => e.value === entry.mood)?.emoji || '😐'}
                                                </span>
                                                <div className="mono" style={{
                                                    fontSize: '1.1rem', fontWeight: 700,
                                                    color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)',
                                                }}>
                                                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                                </div>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'var(--bg-tertiary)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.8rem', fontWeight: 700,
                                                    color: entry.overallRating >= 7 ? 'var(--profit)' : entry.overallRating >= 4 ? 'var(--warning)' : 'var(--loss)',
                                                }}>
                                                    {entry.overallRating}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
                                                <div className="grid-2" style={{ marginBottom: '16px' }}>
                                                    {entry.preMarketNotes && (
                                                        <div>
                                                            <div className="form-label" style={{ marginBottom: '4px' }}>Pre-Market</div>
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{entry.preMarketNotes}</p>
                                                        </div>
                                                    )}
                                                    {entry.postMarketNotes && (
                                                        <div>
                                                            <div className="form-label" style={{ marginBottom: '4px' }}>Post-Market</div>
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{entry.postMarketNotes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {entry.lessonsLearned && (
                                                    <div style={{ marginBottom: '12px' }}>
                                                        <div className="form-label" style={{ marginBottom: '4px' }}>💡 Lessons</div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{entry.lessonsLearned}</p>
                                                    </div>
                                                )}
                                                {entry.goalsForTomorrow && (
                                                    <div style={{ marginBottom: '12px' }}>
                                                        <div className="form-label" style={{ marginBottom: '4px' }}>🎯 Goals</div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{entry.goalsForTomorrow}</p>
                                                    </div>
                                                )}

                                                <button className="btn btn-secondary btn-sm mt-16" onClick={(e) => {
                                                    e.stopPropagation();
                                                    generateDailyReview(entry.date);
                                                }}>
                                                    🤖 Generate AI Review
                                                </button>

                                                {loadingAi && (
                                                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="spinner" /> <span className="text-muted">Generating...</span>
                                                    </div>
                                                )}

                                                {aiReview && (
                                                    <div className="ai-message assistant" style={{ marginTop: '12px' }}
                                                        dangerouslySetInnerHTML={{
                                                            __html: aiReview
                                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                .replace(/### (.*)/g, '<h3>$1</h3>')
                                                                .replace(/\n/g, '<br/>')
                                                        }} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
