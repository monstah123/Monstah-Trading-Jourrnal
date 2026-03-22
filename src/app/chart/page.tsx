"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (chartFullscreen) {
      document.body.classList.add("scroll-locked");
    } else {
      document.body.classList.remove("scroll-locked");
    }
  }, [chartFullscreen]);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    // Aggressively prevent default scrolling behavior when dragging inside the chart area
    const preventScroll = (e: TouchEvent) => {
      // ONLY prevent default if the touch originated inside our div's bounding box
      e.preventDefault();
    };

    el.addEventListener("touchmove", preventScroll, { passive: false });
    
    return () => {
      el.removeEventListener("touchmove", preventScroll);
    };
  }, [mounted]);

  if (!mounted || loading || !user) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Live Chart</h2>
            <p className="text-muted">Analyze the markets in real-time with TradingView</p>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setChartFullscreen(!chartFullscreen)}
            title="Force CSS Full Screen"
          >
            {chartFullscreen ? "❌ Close Fullscreen" : "⛶ True Fullscreen"}
          </button>
        </div>

        <div className="page-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "calc(100vh - 120px)" }}>
          <div ref={chartContainerRef} id="live-chart-container" className="card" style={chartFullscreen ? { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 99999, background: "#13131d", padding: "16px", display: "flex", flexDirection: "column"} : { flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", border: "1px solid var(--border-primary)", borderRadius: "12px", background: "#13131d", touchAction: "none" }}>
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
                container_id="tradingview_chart"
                autosize
              />
          </div>
        </div>
      </main>
    </div>
  );
}
