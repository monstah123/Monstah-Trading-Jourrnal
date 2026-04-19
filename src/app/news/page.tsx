"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const TickerTape = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.TickerTape),
  { ssr: false }
);

const STREAMS = [
  {
    id: "schwab",
    label: "📺 Schwab Network",
    description: "Live markets, expert analysis, 24/7",
    color: "#0074D9",
    embedUrl: "https://www.youtube.com/embed/8BNuc5DYG0M?si=mXilipPA94If854b&autoplay=1&mute=1",
    fallbackUrl: "https://www.youtube.com/watch?v=8BNuc5DYG0M",
    type: "youtube",
  },
  {
    id: "bloomberg",
    label: "📡 Bloomberg TV",
    description: "Global finance & market news",
    color: "#F5A623",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1&mute=1",
    fallbackUrl: "https://www.bloomberg.com/live",
    type: "youtube",
  },
  {
    id: "cnbc",
    label: "📰 CNBC",
    description: "Business & financial news",
    color: "#CC0000",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCvJJ_dzjViJCoLf5uKUTwoA&autoplay=1&mute=1",
    fallbackUrl: "https://www.cnbc.com/live-tv/",
    type: "youtube",
  },
];

const MARKET_NEWS_FEEDS = [
  { label: "MarketWatch", url: "https://www.marketwatch.com", icon: "📊" },
  { label: "Reuters", url: "https://www.reuters.com/finance", icon: "📰" },
  { label: "FXStreet", url: "https://www.fxstreet.com", icon: "💱" },
  { label: "Investing.com", url: "https://www.investing.com/news", icon: "📈" },
];

export default function NewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeStream, setActiveStream] = useState(STREAMS[0]);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleStreamChange = (stream: typeof STREAMS[0]) => {
    setActiveStream(stream);
    setStreamError(false);
  };

  if (!mounted || loading || !user) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* Ticker Tape */}
        <div style={{ marginBottom: "0" }}>
          <TickerTape
            symbols={[
              { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
              { proName: "FOREXCOM:NSXUSD", title: "Nasdaq" },
              { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
              { proName: "FX_IDC:GBPUSD", title: "GBP/USD" },
              { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
              { proName: "OANDA:XAUUSD", title: "Gold" },
              { proName: "TVC:DXY", title: "DXY" },
              { proName: "NYMEX:CL1!", title: "Oil" },
            ]}
            showSymbolLogo
            colorTheme="dark"
            isTransparent
            displayMode="adaptive"
            locale="en"
          />
        </div>

        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="card-title">📡 Market News</span>
          <div className="flex gap-8 items-center">
            {MARKET_NEWS_FEEDS.map((feed) => (
              <a
                key={feed.label}
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.7rem" }}
              >
                {feed.icon} {feed.label}
              </a>
            ))}
          </div>
        </div>

        <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Stream selector */}
          <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
            {STREAMS.map((stream) => (
              <button
                key={stream.id}
                onClick={() => handleStreamChange(stream)}
                className={`btn ${activeStream.id === stream.id ? "btn-primary" : "btn-secondary"}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderLeft: activeStream.id === stream.id ? `3px solid ${stream.color}` : "3px solid transparent",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{stream.label}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 400 }}>{stream.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Main stream embed */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              border: `1px solid ${activeStream.color}40`,
              borderRadius: "12px",
              background: "#0d0d1a",
              position: "relative",
            }}
          >
            {/* Header bar */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: `1px solid ${activeStream.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: `linear-gradient(90deg, ${activeStream.color}15, transparent)`,
              }}
            >
              <div className="flex items-center gap-12">
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 8px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{activeStream.label}</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: "#22c55e22",
                    color: "#22c55e",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  LIVE
                </span>
              </div>
              <a
                href={activeStream.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.7rem" }}
              >
                ↗ Open Full Screen
              </a>
            </div>

            {/* Stream iframe */}
            {streamError ? (
              <div
                style={{
                  height: "520px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: "3rem" }}>📺</div>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>Live stream unavailable</div>
                <div style={{ fontSize: "0.8rem", textAlign: "center", maxWidth: "300px" }}>
                  The live stream may be paused or restricted. Watch it directly on their platform.
                </div>
                <a
                  href={activeStream.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  ↗ Watch on {activeStream.label}
                </a>
              </div>
            ) : (
              <iframe
                key={activeStream.id}
                src={activeStream.embedUrl}
                style={{ width: "100%", height: "520px", border: "none", display: "block" }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onError={() => setStreamError(true)}
                title={`${activeStream.label} Live Stream`}
              />
            )}
          </div>

          {/* Bottom row: quick links */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>📌 Quick News Links</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Open in new tab for full coverage
              </div>
            </div>
            <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
              {[
                { label: "Schwab Network", url: "https://schwabnetwork.com", icon: "📺" },
                { label: "Bloomberg", url: "https://www.bloomberg.com/live", icon: "📡" },
                { label: "ForexFactory", url: "https://www.forexfactory.com", icon: "📅" },
                { label: "FXStreet", url: "https://www.fxstreet.com", icon: "💱" },
                { label: "Economic Calendar", url: "https://www.investing.com/economic-calendar/", icon: "🗓️" },
                { label: "CNBC", url: "https://www.cnbc.com/live-tv/", icon: "📰" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem" }}
                >
                  {link.icon} {link.label}
                </a>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
