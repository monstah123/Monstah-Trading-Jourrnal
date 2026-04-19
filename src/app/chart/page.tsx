"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getWatchlist, saveWatchlist, getChartProjects, saveChartProject, generateId } from "@/lib/storage";
import { ChartProject } from "@/types/trade";

// Dynamically import TradingView widget to avoid SSR issues
const AdvancedRealTimeChart = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false }
);

export default function LiveChartPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  
  // Watchlist & Projects state
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [projects, setProjects] = useState<ChartProject[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("last-selected-symbol") || "ICMARKETS:EURUSD";
    }
    return "ICMARKETS:EURUSD";
  });
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch watchlist & projects from Firestore/LocalStorage on mount
  useEffect(() => {
    if (user) {
      getWatchlist(user.uid).then(setWatchlist);
      getChartProjects(user.uid).then(setProjects);
      
      const savedSymbol = localStorage.getItem("last-selected-symbol");
      if (savedSymbol) {
        setSelectedSymbol(savedSymbol);
      }
    }
  }, [user]);

  const handleSymbolChange = (symbol: string) => {
    setSelectedProjectId(null);
    setIsChartLoading(true);
    setSelectedSymbol(symbol);
    localStorage.setItem("last-selected-symbol", symbol);
    setTimeout(() => setIsChartLoading(false), 1500);
  };

  const handleProjectOpen = (project: ChartProject) => {
    setIsChartLoading(true);
    setSelectedSymbol(project.symbol);
    setSelectedProjectId(project.id);
    localStorage.setItem("last-selected-symbol", project.symbol);
    // Use symbol-based key so TradingView restores drawings for this symbol
    setTimeout(() => setIsChartLoading(false), 1500);
  };

  const createProject = async () => {
    if (!projectName.trim() || !user) return;
    
    const newProject: ChartProject = {
      id: generateId(),
      name: projectName.trim(),
      symbol: selectedSymbol,
      createdAt: new Date().toISOString(),
    };

    const updated = [newProject, ...projects];
    try {
      await saveChartProject(user.uid, updated);
      setProjects(updated);
      setProjectName("");
      setToast({ message: "Project saved! 📁", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Failed to save project", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    const updated = projects.filter(p => p.id !== id);
    try {
      await saveChartProject(user.uid, updated);
      setProjects(updated);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    if (chartFullscreen) {
      document.body.classList.add("scroll-locked");
      document.documentElement.classList.add("scroll-locked");
    } else {
      document.body.classList.remove("scroll-locked");
      document.documentElement.classList.remove("scroll-locked");
    }
  }, [chartFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setChartFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!mounted || loading || !user) return null;

  const toggleFullscreen = () => {
    const chartEl = document.getElementById("live-chart-container");
    if (chartEl) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartEl.requestFullscreen().catch(err => console.error("Error attempting to enable full-screen mode:", err.message));
      }
    }
  };

  const addToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !user) return;
    
    setIsUpdatingWatchlist(true);
    let sym = newSymbol.trim().toUpperCase();
    
    // Auto-prefix common pairs if missing
    if (!sym.includes(":")) {
      if (sym.length === 6) sym = `FX:${sym}`;
      else if (["BTCUSD", "ETHUSD", "SOLUSD"].includes(sym)) sym = `BINANCE:${sym}`;
    }

    if (watchlist.includes(sym)) {
      setToast({ message: `${sym} is already in your watchlist!`, type: "success" });
      setNewSymbol("");
      setIsUpdatingWatchlist(false);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const updated = [...new Set([...watchlist, sym])];
    try {
      await saveWatchlist(user.uid, updated);
      setWatchlist(updated);
      setNewSymbol("");
      setToast({ message: `Added ${sym} to watchlist!`, type: "success" });
    } catch (err) {
      console.error("Save failed:", err);
      setToast({ message: "Failed to save symbol.", type: "error" });
    } finally {
      setIsUpdatingWatchlist(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    if (!user) return;
    setIsUpdatingWatchlist(true);
    const updated = watchlist.filter(s => s !== symbol);
    try {
      await saveWatchlist(user.uid, updated);
      setWatchlist(updated);
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex gap-16 items-center">
            <span className="card-title">📈 Live Chart</span>
            <form onSubmit={addToWatchlist} className="flex gap-2 items-center">
              <input
                className="form-input"
                style={{ width: '100px', padding: '4px 8px', fontSize: '0.7rem', height: '28px', borderRadius: '4px' }}
                placeholder="Symbol..."
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                disabled={isUpdatingWatchlist}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  padding: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '1.1rem',
                  borderRadius: '4px'
                }} 
                disabled={isUpdatingWatchlist}
                title="Add to Watchlist"
              >
                +
              </button>
            </form>
            <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap', maxWidth: '400px' }}>
               {[
                  "FX:EURUSD", "FX:GBPUSD", "OANDA:XAUUSD", "BINANCE:BTCUSDT", 
                  "BINANCE:ETHUSDT", "AMEX:SPY", "NASDAQ:QQQ", "NASDAQ:TSLA", "NASDAQ:NVDA"
                ].map(s => (
                  <span 
                    key={s} 
                    className={`badge badge-secondary ${selectedSymbol === s ? 'active' : ''}`}
                    style={{ 
                      fontSize: '0.6rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer',
                      border: selectedSymbol === s ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      opacity: watchlist.includes(s) || [
                        "FX:EURUSD", "FX:GBPUSD", "OANDA:XAUUSD", "BINANCE:BTCUSDT", 
                        "BINANCE:ETHUSDT", "AMEX:SPY", "NASDAQ:QQQ", "NASDAQ:TSLA", "NASDAQ:NVDA"
                      ].includes(s) ? 1 : 0.6
                    }}
                    onClick={() => handleSymbolChange(s)}
                  >
                    {s}
                  </span>
                ))}
                {watchlist.filter(s => ![
                  "FX:EURUSD", "FX:GBPUSD", "OANDA:XAUUSD", "BINANCE:BTCUSDT", 
                  "BINANCE:ETHUSDT", "AMEX:SPY", "NASDAQ:QQQ", "NASDAQ:TSLA", "NASDAQ:NVDA"
                ].includes(s)).map(s => (
                  <span 
                    key={s} 
                    className={`badge badge-secondary ${selectedSymbol === s ? 'active' : ''}`} 
                    style={{ 
                      fontSize: '0.6rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer',
                      border: selectedSymbol === s ? '1px solid var(--accent-primary)' : '1px solid transparent'
                    }}
                    onClick={() => handleSymbolChange(s)}
                  >
                    {s} <button type="button" onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s); }} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}>×</button>
                  </span>
                ))}
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={toggleFullscreen}
            title={chartFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
          >
            {chartFullscreen ? "↙ Exit Fullscreen" : "⛶ Fullscreen"}
          </button>
        </div>

        {toast && (
          <div 
            style={{ 
              position: 'fixed', 
              top: '20px', 
              right: '20px', 
              padding: '12px 24px', 
              background: toast.type === 'success' ? 'var(--profit)' : 'var(--loss)', 
              color: 'white', 
              borderRadius: '8px', 
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontWeight: 600,
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {toast.message}
          </div>
        )}

        <div className="page-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "calc(100vh - 120px)" }}>
          <div id="live-chart-container" ref={chartContainerRef} className="card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", border: "1px solid var(--border-primary)", borderRadius: "12px", background: "#13131d", touchAction: "none" }}>
            <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div className="flex gap-8 items-center" style={{ flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>📁 Projects:</span>
                {projects.length === 0 ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No saved projects yet</span>
                ) : (
                  projects.map(p => (
                    <div 
                      key={p.id} 
                      className={`badge ${selectedProjectId === p.id ? 'badge-primary' : 'badge-secondary'}`}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', padding: '4px 10px', border: selectedProjectId === p.id ? '1px solid var(--accent-primary)' : '1px solid transparent' }}
                      onClick={() => handleProjectOpen(p)}
                    >
                      <span>📁 {p.name} ({p.symbol})</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                        style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', padding: 0, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-8 items-center">
                <input
                  className="form-input"
                  style={{ width: '160px', padding: '4px 8px', fontSize: '0.7rem', height: '28px', borderRadius: '4px' }}
                  placeholder="Project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={createProject}
                  style={{ height: '28px', fontSize: '0.7rem' }}
                >
                  💾 Save Project
                </button>
              </div>
            </div>
             <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
               {isChartLoading && (
                 <div style={{ position: 'absolute', inset: 0, background: '#13131d', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading {selectedSymbol}...</span>
                 </div>
               )}
               <AdvancedRealTimeChart
                key={`monstah-chart-${selectedSymbol}`}
                theme="dark"
                symbol={selectedSymbol}
                interval="60"
                timezone="Etc/UTC"
                style="1"
                locale="en"
                enable_publishing={false}
                hide_side_toolbar={false}
                allow_symbol_change={true}
                withdateranges={true}
                save_image={true}
                details={true}
                hotlist={true}
                calendar={true}
                watchlist={watchlist}
                show_popup_button={true}
                // @ts-ignore
                countdown={true}
                container_id="monstah_tradingview_chart"
                autosize
              />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
