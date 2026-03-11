"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ShareData {
    displayName: string;
    createdAt: string;
    stats: {
        totalTrades: number;
        winRate: number;
        totalPnl: number;
        profitFactor: number;
        wins: number;
        losses: number;
        bestTrade: { symbol: string; pnl: number } | null;
    };
}

export default function SharePage() {
    const params = useParams();
    const shareId = params?.id as string;
    const [data, setData] = useState<ShareData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!shareId) return;
        fetch(`/api/share?id=${shareId}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) setError("Share not found.");
                else setData(d);
            })
            .catch(() => setError("Failed to load."))
            .finally(() => setLoading(false));
    }, [shareId]);

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f" }}>
            <div className="spinner" />
        </div>
    );

    if (error || !data) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f", color: "#f0f0f5" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
            <h2>Share Not Found</h2>
            <p style={{ color: "#8888a0", marginTop: 8 }}>This link may have expired or never existed.</p>
        </div>
    );

    const { stats } = data;
    const isProfitable = stats.totalPnl >= 0;

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>

            {/* Card */}
            <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(135deg, #13131d 0%, #1a1a28 100%)", borderRadius: 24, padding: 36, border: "1px solid rgba(108,92,231,0.3)", boxShadow: "0 0 60px rgba(108,92,231,0.2)", position: "relative", overflow: "hidden" }}>

                {/* Glow */}
                <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: isProfitable ? "rgba(0,230,118,0.08)" : "rgba(255,82,82,0.08)", filter: "blur(40px)" }} />

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🔥</div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c5ce7", letterSpacing: 3, marginBottom: 4 }}>MONSTAH!!! TRADING JOURNAL</div>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f0f0f5", margin: 0 }}>{data.displayName}</h1>
                    <div style={{ fontSize: "0.8rem", color: "#8888a0", marginTop: 6 }}>
                        Performance Report · {new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Big P&L */}
                <div style={{ textAlign: "center", marginBottom: 32, padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "0.75rem", color: "#8888a0", letterSpacing: 2, marginBottom: 6 }}>TOTAL P&L</div>
                    <div style={{ fontSize: "3.5rem", fontWeight: 900, color: isProfitable ? "#00e676" : "#ff5252", lineHeight: 1 }}>
                        {isProfitable ? "+" : ""}{stats.totalPnl >= 0 ? "+" : ""}${Math.abs(stats.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    {[
                        { label: "Win Rate", value: `${stats.winRate}%`, color: stats.winRate >= 50 ? "#00e676" : "#ff5252" },
                        { label: "Profit Factor", value: stats.profitFactor === 999 ? "∞" : `${stats.profitFactor}x`, color: stats.profitFactor >= 1 ? "#00e676" : "#ff5252" },
                        { label: "Total Trades", value: stats.totalTrades, color: "#f0f0f5" },
                        { label: "W / L", value: `${stats.wins} / ${stats.losses}`, color: "#f0f0f5" },
                    ].map((item) => (
                        <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ fontSize: "0.75rem", color: "#8888a0", marginBottom: 6 }}>{item.label}</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Best trade */}
                {stats.bestTrade && (
                    <div style={{ background: "rgba(0,230,118,0.07)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
                        <div style={{ fontSize: "0.75rem", color: "#8888a0", marginBottom: 4 }}>🏆 Best Trade</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, color: "#f0f0f5" }}>{stats.bestTrade.symbol}</span>
                            <span style={{ fontWeight: 800, color: "#00e676" }}>+${stats.bestTrade.pnl.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: "center" }}>
                    <a href="https://monstah-trading-jourrnal.vercel.app" style={{ fontSize: "0.8rem", color: "#6c5ce7", textDecoration: "none", fontWeight: 600 }}>
                        Track your trades at monstah-trading-jourrnal.vercel.app →
                    </a>
                </div>
            </div>
        </div>
    );
}
