'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { saveTrade, generateId, getTradeById } from '@/lib/storage';
import { calculatePnl, calculateRiskReward } from '@/lib/stats';
import { Trade, TradeDirection, AssetClass, TradeSetup, Emotion } from '@/types/trade';

const SETUPS: TradeSetup[] = ['breakout', 'pullback', 'reversal', 'trend_following', 'scalp', 'swing', 'gap_fill', 'momentum', 'mean_reversion', 'custom'];
const EMOTIONS: { value: Emotion; emoji: string; label: string }[] = [
    { value: 'confident', emoji: '😎', label: 'Confident' },
    { value: 'fearful', emoji: '😰', label: 'Fearful' },
    { value: 'greedy', emoji: '🤑', label: 'Greedy' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
    { value: 'anxious', emoji: '😟', label: 'Anxious' },
    { value: 'disciplined', emoji: '🎯', label: 'Disciplined' },
    { value: 'impulsive', emoji: '⚡', label: 'Impulsive' },
    { value: 'calm', emoji: '🧘', label: 'Calm' },
];

export default function NewTrade() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [originalTradeId, setOriginalTradeId] = useState<string | null>(null);

    const [form, setForm] = useState({
        symbol: '',
        assetClass: 'stocks' as AssetClass,
        direction: 'long' as TradeDirection,
        entryPrice: '',
        exitPrice: '',
        quantity: '',
        stopLoss: '',
        takeProfit: '',
        fees: '0',
        setup: 'breakout' as TradeSetup,
        emotionBefore: 'neutral' as Emotion,
        emotionAfter: 'neutral' as Emotion,
        confidence: 5,
        notes: '',
        strategy: '',
        tags: '',
        date: new Date().toISOString().split('T')[0],
        entryTime: '',
        exitTime: '',
        status: 'closed' as 'open' | 'closed',
    });

    useEffect(() => {
        if (editId) {
            const trade = getTradeById(editId);
            if (trade) {
                setIsEditing(true);
                setOriginalTradeId(trade.id);
                setForm({
                    symbol: trade.symbol,
                    assetClass: trade.assetClass,
                    direction: trade.direction,
                    entryPrice: trade.entryPrice.toString(),
                    exitPrice: trade.exitPrice ? trade.exitPrice.toString() : '',
                    quantity: trade.quantity.toString(),
                    stopLoss: trade.stopLoss ? trade.stopLoss.toString() : '',
                    takeProfit: trade.takeProfit ? trade.takeProfit.toString() : '',
                    fees: trade.fees.toString(),
                    setup: trade.setup,
                    emotionBefore: trade.emotionBefore,
                    emotionAfter: trade.emotionAfter ?? 'neutral',
                    confidence: trade.confidence,
                    notes: trade.notes || '',
                    strategy: trade.strategy || '',
                    tags: trade.tags?.join(', ') || '',
                    date: trade.date.split('T')[0],
                    entryTime: trade.entryTime?.split('T')[1]?.substring(0, 5) || '',
                    exitTime: trade.exitTime?.split('T')[1]?.substring(0, 5) || '',
                    status: trade.status,
                });
            }
        }
    }, [editId]);

    const handleChange = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.symbol || !form.entryPrice || !form.quantity) {
            showToast('Please fill in required fields', 'error');
            return;
        }

        const tradeData: Partial<Trade> = {
            entryPrice: parseFloat(form.entryPrice),
            exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : null,
            quantity: parseFloat(form.quantity),
            stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
            takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
            fees: parseFloat(form.fees || '0'),
            direction: form.direction,
        };

        const pnl = form.status === 'closed' ? calculatePnl(tradeData) : null;
        const rr = calculateRiskReward(tradeData);

        const trade: Trade = {
            id: isEditing && originalTradeId ? originalTradeId : generateId(),
            date: form.date + 'T' + (form.entryTime || '09:30'),
            symbol: form.symbol.toUpperCase(),
            assetClass: form.assetClass,
            direction: form.direction,
            status: form.status,
            entryPrice: parseFloat(form.entryPrice),
            exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : null,
            quantity: parseFloat(form.quantity),
            stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
            takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
            fees: parseFloat(form.fees || '0'),
            pnl: pnl,
            pnlPercent: pnl !== null && parseFloat(form.entryPrice) > 0 ? (pnl / (parseFloat(form.entryPrice) * parseFloat(form.quantity))) * 100 : null,
            setup: form.setup,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            emotionBefore: form.emotionBefore,
            emotionAfter: form.status === 'closed' ? form.emotionAfter : null,
            confidence: form.confidence,
            notes: form.notes,
            screenshot: null,
            entryTime: form.date + 'T' + (form.entryTime || '09:30'),
            exitTime: form.exitTime ? form.date + 'T' + form.exitTime : null,
            strategy: form.strategy,
            riskReward: rr,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        saveTrade(trade);
        showToast(isEditing ? 'Trade updated successfully! ✅' : 'Trade logged successfully! 🔥', 'success');
        setTimeout(() => router.push('/trades'), 1000);
    };

    const livePnl = form.exitPrice && form.entryPrice && form.quantity
        ? calculatePnl({
            entryPrice: parseFloat(form.entryPrice),
            exitPrice: parseFloat(form.exitPrice),
            quantity: parseFloat(form.quantity),
            direction: form.direction,
            fees: parseFloat(form.fees || '0'),
        })
        : null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h2>{isEditing ? '✏️ Edit Trade' : 'Log New Trade'}</h2>
                    <p>{isEditing ? `Editing ${form.symbol || 'trade'}` : 'Record every detail of your trade for maximum insights'}</p>
                </div>
                <div className="page-body">
                    <form onSubmit={handleSubmit}>
                        {livePnl !== null && (
                            <div className="card" style={{ marginBottom: '24px', background: livePnl >= 0 ? 'var(--profit-bg)' : 'var(--loss-bg)', border: `1px solid ${livePnl >= 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`, textAlign: 'center', padding: '20px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>ESTIMATED P&amp;L</div>
                                <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: livePnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                                    {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
                                </div>
                            </div>
                        )}

                        <div className="card mb-24">
                            <div className="card-header">
                                <span className="card-title">📝 Trade Details</span>
                                <div className="flex gap-8">
                                    <button type="button" className={`btn btn-sm ${form.status === 'closed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleChange('status', 'closed')}>Closed</button>
                                    <button type="button" className={`btn btn-sm ${form.status === 'open' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleChange('status', 'open')}>Open</button>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Symbol *</label>
                                    <input className="form-input" placeholder="e.g. AAPL, SPY, BTC" value={form.symbol} onChange={e => handleChange('symbol', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Asset Class</label>
                                    <select className="form-select" value={form.assetClass} onChange={e => handleChange('assetClass', e.target.value)}>
                                        <option value="stocks">Stocks</option>
                                        <option value="options">Options</option>
                                        <option value="futures">Futures</option>
                                        <option value="forex">Forex</option>
                                        <option value="crypto">Crypto</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Direction</label>
                                    <div className="flex gap-8">
                                        <button type="button" style={{ flex: 1 }} className={`btn ${form.direction === 'long' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleChange('direction', 'long')}>📈 Long</button>
                                        <button type="button" style={{ flex: 1 }} className={`btn ${form.direction === 'short' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleChange('direction', 'short')}>📉 Short</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => handleChange('date', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Entry Price *</label>
                                    <input type="number" step="any" className="form-input" placeholder="0.00" value={form.entryPrice} onChange={e => handleChange('entryPrice', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Exit Price {form.status === 'closed' ? '*' : ''}</label>
                                    <input type="number" step="any" className="form-input" placeholder="0.00" value={form.exitPrice} onChange={e => handleChange('exitPrice', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Quantity *</label>
                                    <input type="number" step="any" className="form-input" placeholder="0" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fees</label>
                                    <input type="number" step="any" className="form-input" placeholder="0.00" value={form.fees} onChange={e => handleChange('fees', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Stop Loss</label>
                                    <input type="number" step="any" className="form-input" placeholder="0.00" value={form.stopLoss} onChange={e => handleChange('stopLoss', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Take Profit</label>
                                    <input type="number" step="any" className="form-input" placeholder="0.00" value={form.takeProfit} onChange={e => handleChange('takeProfit', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Entry Time</label>
                                    <input type="time" className="form-input" value={form.entryTime} onChange={e => handleChange('entryTime', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Exit Time</label>
                                    <input type="time" className="form-input" value={form.exitTime} onChange={e => handleChange('exitTime', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="card mb-24">
                            <div className="card-header"><span className="card-title">🎯 Strategy &amp; Setup</span></div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Setup Type</label>
                                    <select className="form-select" value={form.setup} onChange={e => handleChange('setup', e.target.value)}>
                                        {SETUPS.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Strategy Name</label>
                                    <input className="form-input" placeholder="e.g. VWAP Bounce, Gap &amp; Go" value={form.strategy} onChange={e => handleChange('strategy', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tags (comma separated)</label>
                                    <input className="form-input" placeholder="e.g. earnings, high-volume, catalyst" value={form.tags} onChange={e => handleChange('tags', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="card mb-24">
                            <div className="card-header"><span className="card-title">🧠 Psychology</span></div>
                            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group">
                                    <label className="form-label">Emotion Before Trade</label>
                                    <div className="emotion-grid">
                                        {EMOTIONS.map(e => (
                                            <button type="button" key={e.value} className={`emotion-btn ${form.emotionBefore === e.value ? 'selected' : ''}`} onClick={() => handleChange('emotionBefore', e.value)}>
                                                {e.emoji} {e.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {form.status === 'closed' && (
                                    <div className="form-group">
                                        <label className="form-label">Emotion After Trade</label>
                                        <div className="emotion-grid">
                                            {EMOTIONS.map(e => (
                                                <button type="button" key={e.value} className={`emotion-btn ${form.emotionAfter === e.value ? 'selected' : ''}`} onClick={() => handleChange('emotionAfter', e.value)}>
                                                    {e.emoji} {e.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="form-group mt-16">
                                <label className="form-label">Confidence Level: {form.confidence}/10</label>
                                <input type="range" min="1" max="10" className="confidence-slider" value={form.confidence} onChange={e => handleChange('confidence', parseInt(e.target.value))} />
                                <div className="flex justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}><span>Low</span><span>High</span></div>
                            </div>
                        </div>

                        <div className="card mb-24">
                            <div className="card-header"><span className="card-title">📝 Notes</span></div>
                            <div className="form-group">
                                <textarea className="form-textarea" placeholder="What was your thesis? What did you observe? Any lessons learned?" value={form.notes} onChange={e => handleChange('notes', e.target.value)} style={{ minHeight: '120px' }} />
                            </div>
                        </div>

                        <div className="flex gap-16 justify-between">
                            <button type="button" className="btn btn-secondary" onClick={() => router.push('/trades')}>Cancel</button>
                            <button type="submit" className="btn btn-primary btn-lg">{isEditing ? '✅ Update Trade' : '🔥 Save Trade'}</button>
                        </div>
                    </form>
                </div>
                {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</div>}
            </main>
        </div>
    );
}
