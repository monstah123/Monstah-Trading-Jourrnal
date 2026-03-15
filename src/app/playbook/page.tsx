"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { getPlaybooks, savePlaybook, deletePlaybook, getTrades, generateId } from "@/lib/storage";
import { Playbook, TradeSetup, AssetClass } from "@/types/trade";
import { useAuth } from "@/components/AuthProvider";

const SETUPS: TradeSetup[] = [
    "breakout", "pullback", "reversal", "trend_following",
    "scalp", "swing", "gap_fill", "momentum", "mean_reversion", "custom",
];

const ASSETS: AssetClass[] = ["stocks", "options", "futures", "forex", "crypto"];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "Daily", "Weekly"];

const SETUP_EMOJI: Record<string, string> = {
    breakout: "🚀", pullback: "🔄", reversal: "↩️", trend_following: "📈",
    scalp: "⚡", swing: "🌊", gap_fill: "🕳️", momentum: "💨",
    mean_reversion: "🎯", custom: "✨",
};

export default function PlaybookPage() {
    const { user } = useAuth();
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [mounted, setMounted] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<Playbook | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRule, setNewRule] = useState("");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        rules: [] as string[],
        setup: "breakout" as TradeSetup,
        timeframe: "1H",
        assetClasses: ["forex"] as AssetClass[],
    });

    useEffect(() => {
        setMounted(true);
        if (user) {
            Promise.all([getPlaybooks(user.uid), getTrades(user.uid)]).then(
                ([pbs, trades]) => {
                    // Auto-calculate win rates from trades
                    const enriched = pbs.map((pb) => {
                        const related = trades.filter(
                            (t) => t.strategy?.toLowerCase() === pb.name.toLowerCase() && t.status === "closed"
                        );
                        const wins = related.filter((t) => (t.pnl ?? 0) > 0).length;
                        return {
                            ...pb,
                            totalTrades: related.length,
                            winRate: related.length > 0 ? (wins / related.length) * 100 : null,
                        };
                    });
                    setPlaybooks(enriched);
                }
            );
        }
    }, [user]);

    if (!mounted) return null;

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const resetForm = () => {
        setForm({ name: "", description: "", rules: [], setup: "breakout", timeframe: "1H", assetClasses: ["forex"] });
        setNewRule("");
    };

    const addRule = () => {
        if (!newRule.trim()) return;
        setForm((prev) => ({ ...prev, rules: [...prev.rules, newRule.trim()] }));
        setNewRule("");
    };

    const removeRule = (i: number) => {
        setForm((prev) => ({ ...prev, rules: prev.rules.filter((_, idx) => idx !== i) }));
    };

    const toggleAsset = (asset: AssetClass) => {
        setForm((prev) => ({
            ...prev,
            assetClasses: prev.assetClasses.includes(asset)
                ? prev.assetClasses.filter((a) => a !== asset)
                : [...prev.assetClasses, asset],
        }));
    };

    const handleSave = async () => {
        if (!user || !form.name.trim()) return showToast("Strategy name is required!", "error");
        if (form.rules.length === 0) return showToast("Add at least one rule!", "error");
        const pb: Playbook = {
            id: editingId || generateId(),
            ...form,
            winRate: editingId ? playbooks.find(p => p.id === editingId)?.winRate || null : null,
            totalTrades: editingId ? playbooks.find(p => p.id === editingId)?.totalTrades || 0 : 0,
            createdAt: editingId ? playbooks.find(p => p.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await savePlaybook(user.uid, pb);
        
        if (editingId) {
            setPlaybooks((prev) => prev.map(p => p.id === editingId ? pb : p));
        } else {
            setPlaybooks((prev) => [pb, ...prev]);
        }
        
        setShowForm(false);
        setEditingId(null);
        resetForm();
        showToast(editingId ? "🎯 Strategy updated!" : "🎯 Strategy saved!", "success");
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        if (!window.confirm("Are you sure you want to delete this strategy? This cannot be undone.")) return;
        
        try {
            await deletePlaybook(user.uid, id);
            setPlaybooks((prev) => prev.filter(p => p.id !== id));
            if (selected?.id === id) setSelected(null);
            if (editingId === id) {
                setEditingId(null);
                setShowForm(false);
                resetForm();
            }
            showToast("Strategy deleted! 🗑️", "success");
        } catch (error) {
            console.error("Delete error:", error);
            showToast("Failed to delete strategy.", "error");
        }
    };

    const handleEdit = (e: React.MouseEvent, pb: Playbook) => {
        e.stopPropagation();
        setForm({
            name: pb.name,
            description: pb.description,
            rules: pb.rules,
            setup: pb.setup,
            timeframe: pb.timeframe,
            assetClasses: pb.assetClasses,
        });
        setEditingId(pb.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <h2>Playbook</h2>
                            <p>Your trading strategy rulebook — document, refine, dominate</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => { 
                            setShowForm(!showForm); 
                            setSelected(null); 
                            setEditingId(null);
                            if (!showForm) resetForm();
                        }}>
                            {showForm ? "✕ Close" : "➕ New Strategy"}
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    {/* Create Form */}
                    {showForm && (
                        <div className="card" style={{ marginBottom: 24, border: "1px solid var(--accent-primary)", boxShadow: "0 0 20px rgba(108,92,231,0.15)" }}>
                            <h3 style={{ marginBottom: 20, fontSize: "1.1rem", color: "var(--accent-primary)" }}>
                                {editingId ? "✏️ Edit Strategy" : "🎯 New Strategy"}
                            </h3>
                            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Strategy Name *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Monstah Stealth Sniper"
                                        value={form.name}
                                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Setup Type</label>
                                    <select className="form-input" value={form.setup} onChange={(e) => setForm((p) => ({ ...p, setup: e.target.value as TradeSetup }))}>
                                        {SETUPS.map((s) => <option key={s} value={s}>{SETUP_EMOJI[s]} {s.replace("_", " ")}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    placeholder="What is this strategy? When does it work best?"
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    style={{ resize: "vertical" }}
                                />
                            </div>
                            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Timeframe</label>
                                    <select className="form-input" value={form.timeframe} onChange={(e) => setForm((p) => ({ ...p, timeframe: e.target.value }))}>
                                        {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Asset Classes</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                                        {ASSETS.map((a) => (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => toggleAsset(a)}
                                                style={{
                                                    padding: "4px 12px", borderRadius: 20, fontSize: "0.8rem", cursor: "pointer",
                                                    border: form.assetClasses.includes(a) ? "1px solid var(--accent-primary)" : "1px solid var(--border-secondary)",
                                                    background: form.assetClasses.includes(a) ? "var(--accent-primary-glow)" : "transparent",
                                                    color: form.assetClasses.includes(a) ? "var(--accent-primary)" : "var(--text-muted)",
                                                }}
                                            >{a}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Rules */}
                            <div className="form-group">
                                <label className="form-label">Rules *</label>
                                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Only trade during London session"
                                        value={newRule}
                                        onChange={(e) => setNewRule(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addRule()}
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-secondary" onClick={addRule}>Add</button>
                                </div>
                                {form.rules.length === 0 ? (
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No rules yet — press Enter or click Add</p>
                                ) : (
                                    <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                                        {form.rules.map((rule, i) => (
                                            <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: "8px 12px", borderRadius: 8, fontSize: "0.9rem" }}>
                                                <span>{rule}</span>
                                                <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                                <button className="btn btn-primary" onClick={handleSave}>
                                    {editingId ? "💾 Update Strategy" : "💾 Save Strategy"}
                                </button>
                                <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Playbooks Grid */}
                    {playbooks.length === 0 && !showForm ? (
                        <div className="empty-state">
                            <div className="empty-icon">📖</div>
                            <h3>No Strategies Yet</h3>
                            <p>Document your first trading strategy — your rules, your edge, your playbook.</p>
                            <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
                                ➕ Create First Strategy
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                            {playbooks.map((pb) => (
                                <div
                                    key={pb.id}
                                    className="card"
                                    style={{ cursor: "pointer", border: selected?.id === pb.id ? "1px solid var(--accent-primary)" : "1px solid var(--border-primary)", transition: "all 0.2s" }}
                                    onClick={() => setSelected(selected?.id === pb.id ? null : pb)}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{SETUP_EMOJI[pb.setup] || "📋"}</div>
                                            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{pb.name}</h3>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{pb.setup.replace("_", " ")} · {pb.timeframe}</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            {pb.winRate !== null ? (
                                                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: pb.winRate >= 50 ? "var(--profit)" : "var(--loss)" }}>
                                                    {pb.winRate.toFixed(0)}%
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No trades</div>
                                            )}
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{pb.totalTrades} trades</div>
                                        </div>
                                    </div>

                                    {pb.description && (
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>{pb.description}</p>
                                    )}

                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                                        {pb.assetClasses.map((a) => (
                                            <span key={a} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 12, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-secondary)" }}>{a}</span>
                                        ))}
                                    </div>

                                    {/* Rules expanded when selected */}
                                    {selected?.id === pb.id && (
                                        <div style={{ borderTop: "1px solid var(--border-primary)", paddingTop: 14, marginTop: 4 }}>
                                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-secondary)", marginBottom: 10, letterSpacing: 1 }}>RULES</div>
                                            <ol style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                                                {pb.rules.map((rule, i) => (
                                                    <li key={i} style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{rule}</li>
                                                ))}
                                            </ol>

                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-secondary)" }}>
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                                    onClick={(e) => handleEdit(e, pb)}
                                                >
                                                    ✏️ Edit Strategy
                                                </button>
                                                <button 
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: "var(--loss)", padding: "6px 14px", fontSize: "0.8rem" }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(pb.id);
                                                    }}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
