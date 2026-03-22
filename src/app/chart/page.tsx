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
  const [isUpdating, setIsUpdating] = useState(false);

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
    
    setIsUpdating(true);
    const updated = [...new Set([...watchlist, newSymbol.trim().toUpperCase()])];
    try {
      await saveWatchlist(user.uid, updated);
      setWatchlist(updated);
      setNewSymbol("");
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    if (!user) return;
    setIsUpdating(true);
    const updated = watchlist.filter(s => s !== symbol);
    try {
      await saveWatchlist(user.uid, updated);
      setWatchlist(updated);
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Live Chart</h2>
            <div className="flex gap-8 items-center mt-8">
              <form onSubmit={addToWatchlist} className="flex gap-4">
                <input
                  className="form-input"
                  style={{ width: '140px', padding: '6px 12px', fontSize: '0.75rem', height: '32px' }}
                  placeholder="Add e.g. NVDA"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  disabled={isUpdating}
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 12px', height: '32px' }} disabled={isUpdating}>
                  Add
                </button>
              </form>
              <div className="flex gap-4 items-center">
                 {watchlist.slice(-3).map(s => (
                   <span key={s} className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                     {s} <button onClick={() => removeFromWatchlist(s)} style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', marginLeft: '4px' }}>×</button>
                   </span>
                 ))}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {chartFullscreen ? "↙ Exit Fullscreen" : "⛶ Fullscreen"}
          </button>
        </div>

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
