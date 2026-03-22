"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getWatchlist, saveWatchlist } from "@/lib/storage";

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
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch watchlist from Firestore on mount
  useEffect(() => {
    if (user) {
      getWatchlist(user.uid).then(setWatchlist);
    }
  }, [user]);

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
            <div className="flex gap-4 items-center">
               {watchlist.slice(-2).map(s => (
                 <span key={s} className="badge badge-secondary" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                   {s} <button type="button" onClick={() => removeFromWatchlist(s)} style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', marginLeft: '4px' }}>×</button>
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
             <AdvancedRealTimeChart
                theme="dark"
                symbol="ICMARKETS:EURUSD"
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
                container_id="tradingview_chart"
                autosize
              />
          </div>
        </div>
      </main>
    </div>
  );
}
