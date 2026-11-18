"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  getWatchlist,
  saveWatchlist,
  getChartProjects,
  saveChartProject,
  getChartWorkspace,
  saveChartWorkspace,
  generateId,
} from "@/lib/storage";
import { ChartInterval, ChartLayout, ChartPane, ChartProject } from "@/types/trade";
import {
  CHART_LAYOUTS,
  CHART_TIMEFRAMES,
  DEFAULT_CHART_PANES,
  normalizeChartSymbol,
} from "@/lib/chart";

// Dynamically import TradingView widget to avoid SSR issues
const AdvancedRealTimeChart = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false }
);

const QUICK_SYMBOLS = [
  "FX:EURUSD",
  "FX:GBPUSD",
  "OANDA:XAUUSD",
  "BINANCE:BTCUSDT",
  "BINANCE:ETHUSDT",
  "AMEX:SPY",
  "NASDAQ:QQQ",
  "NASDAQ:TSLA",
  "NASDAQ:NVDA",
];

const LAYOUT_LABELS: Record<ChartLayout, string> = {
  1: "Single chart",
  2: "Two charts side by side",
  4: "Four chart grid",
};

interface WatchlistQuote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
}

function splitChartSymbol(symbol: string): { exchange: string; ticker: string } {
  const [exchange, ...rest] = symbol.split(":");
  if (rest.length === 0) return { exchange: "—", ticker: symbol };
  return { exchange, ticker: rest.join(":") };
}

function formatQuotePrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return "—";
  if (price >= 1000) {
    return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 5,
  });
}

function formatQuoteChange(changePercent: number | null | undefined): string {
  if (
    changePercent === null ||
    changePercent === undefined ||
    !Number.isFinite(changePercent)
  ) {
    return "—";
  }
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

function PaneSymbolInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (symbol: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cancelEdit = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      className="chart-pane-symbol"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelEdit.current = true;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (cancelEdit.current) {
          cancelEdit.current = false;
          setDraft(value);
          return;
        }
        const nextSymbol = normalizeChartSymbol(draft);
        if (nextSymbol && nextSymbol !== value) onCommit(nextSymbol);
        else setDraft(value);
      }}
      placeholder="EXCHANGE:SYMBOL"
      spellCheck={false}
      aria-label="Chart symbol"
      title="Type a symbol and press Enter (e.g. NASDAQ:AAPL)"
    />
  );
}

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
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Right-side watchlist panel state
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, WatchlistQuote | null>>({});

  // Multi-chart workspace state
  const [layout, setLayout] = useState<ChartLayout>(1);
  const [panes, setPanes] = useState<ChartPane[]>(() =>
    DEFAULT_CHART_PANES.map((pane) => ({ ...pane }))
  );
  const [activePaneId, setActivePaneId] = useState(DEFAULT_CHART_PANES[0].id);
  const [loadingPaneId, setLoadingPaneId] = useState<string | null>(null);
  const workspaceHydrated = useRef(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch watchlist, projects and the saved multi-chart workspace
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    workspaceHydrated.current = false;

    (async () => {
      const [savedWatchlist, savedProjects, workspace] = await Promise.all([
        getWatchlist(user.uid),
        getChartProjects(user.uid),
        getChartWorkspace(user.uid),
      ]);
      if (cancelled) return;

      setWatchlist(savedWatchlist);
      setProjects(savedProjects);

      if (workspace) {
        setLayout(workspace.layout);
        setPanes(workspace.panes);
        setActivePaneId(workspace.activePaneId);
      } else {
        // Migrate the previous single-chart selection into pane 1
        const savedSymbol = localStorage.getItem("last-selected-symbol");
        if (savedSymbol) {
          setPanes((previous) =>
            previous.map((pane, index) =>
              index === 0 ? { ...pane, symbol: savedSymbol } : pane
            )
          );
        }
      }

      workspaceHydrated.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Persist layout, pane symbols and timeframes
  useEffect(() => {
    if (!user || !workspaceHydrated.current) return;
    saveChartWorkspace(user.uid, { layout, panes, activePaneId }).catch((error) =>
      console.error("Failed to save chart workspace:", error)
    );
  }, [user, layout, panes, activePaneId]);

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    };
  }, []);

  // Poll live quotes for the watchlist panel
  useEffect(() => {
    if (!watchlist.length) {
      setQuotes({});
      return;
    }

    let cancelled = false;

    const loadQuotes = async () => {
      // Skip network work while the tab is in the background
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const response = await fetch(
          `/api/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setQuotes(data.quotes ?? {});
      } catch (error) {
        if (!cancelled) console.error("Failed to load quotes:", error);
      }
    };

    loadQuotes();
    const interval = setInterval(loadQuotes, 5_000);
    const handleVisibility = () => {
      if (!document.hidden) loadQuotes();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [watchlist]);

  const visiblePanes = panes.slice(0, layout);
  const activePane = visiblePanes.find((pane) => pane.id === activePaneId) ?? visiblePanes[0];
  const selectedSymbol = activePane?.symbol ?? DEFAULT_CHART_PANES[0].symbol;

  const showPaneLoading = (paneId: string) => {
    setLoadingPaneId(paneId);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setLoadingPaneId(null), 1200);
  };

  const updatePane = (paneId: string, updates: Partial<ChartPane>) => {
    setPanes((previous) =>
      previous.map((pane) => (pane.id === paneId ? { ...pane, ...updates } : pane))
    );
  };

  const assignSymbol = (
    rawSymbol: string,
    projectId: string | null = null,
    paneId = activePane?.id ?? panes[0].id
  ) => {
    const symbol = normalizeChartSymbol(rawSymbol);
    if (!symbol) return;

    updatePane(paneId, { symbol });
    localStorage.setItem("last-selected-symbol", symbol);
    setSelectedProjectId(projectId);
    showPaneLoading(paneId);
  };

  const changeLayout = (nextLayout: ChartLayout) => {
    setLayout(nextLayout);
    if (!panes.slice(0, nextLayout).some((pane) => pane.id === activePaneId)) {
      setActivePaneId(panes[0].id);
    }
    // Let TradingView widgets recalculate their size after the grid changes
    setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
  };

  const handleProjectOpen = (project: ChartProject) => {
    assignSymbol(project.symbol, project.id);
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
    const updated = projects.filter((p) => p.id !== id);
    try {
      await saveChartProject(user.uid, updated);
      setProjects(updated);
      if (selectedProjectId === id) setSelectedProjectId(null);
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
        chartEl
          .requestFullscreen()
          .catch((err) =>
            console.error("Error attempting to enable full-screen mode:", err.message)
          );
      }
    }
  };

  const addToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !user) return;

    setIsUpdatingWatchlist(true);
    const sym = normalizeChartSymbol(newSymbol);
    if (!sym) {
      setNewSymbol("");
      setIsUpdatingWatchlist(false);
      return;
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
    const updated = watchlist.filter((s) => s !== symbol);
    try {
      await saveWatchlist(user.uid, updated);
      setWatchlist(updated);
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const activeChartNumber = visiblePanes.findIndex((pane) => pane.id === activePane?.id) + 1;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div
          className="card-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div className="flex gap-16 items-center" style={{ flexWrap: "wrap" }}>
            <span className="card-title">📈 Live Chart</span>

            <div className="chart-layout-picker">
              <span className="chart-layout-label">Charts:</span>
              <div
                className="chart-layout-switch"
                role="group"
                aria-label="Chart layout"
              >
                {CHART_LAYOUTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`btn btn-ghost ${layout === count ? "active" : ""}`}
                    onClick={() => changeLayout(count)}
                    aria-pressed={layout === count}
                    title={LAYOUT_LABELS[count]}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={addToWatchlist} className="flex gap-2 items-center">
              <input
                className="form-input"
                style={{
                  width: "100px",
                  padding: "4px 8px",
                  fontSize: "0.7rem",
                  height: "28px",
                  borderRadius: "4px",
                }}
                placeholder="Symbol..."
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                disabled={isUpdatingWatchlist}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: "28px",
                  height: "28px",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  borderRadius: "4px",
                }}
                disabled={isUpdatingWatchlist}
                title="Add to Watchlist"
              >
                +
              </button>
            </form>

            <div
              className="flex gap-4 items-center"
              style={{ flexWrap: "wrap", maxWidth: "400px" }}
            >
              {QUICK_SYMBOLS.map((s) => (
                <span
                  key={s}
                  className={`badge badge-secondary ${selectedSymbol === s ? "active" : ""}`}
                  style={{
                    fontSize: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    border:
                      selectedSymbol === s
                        ? "1px solid var(--accent-primary)"
                        : "1px solid transparent",
                  }}
                  onClick={() => assignSymbol(s)}
                  title={`Open ${s} in chart ${activeChartNumber}`}
                >
                  {s}
                </span>
              ))}
              {watchlist
                .filter((s) => !QUICK_SYMBOLS.includes(s))
                .map((s) => (
                  <span
                    key={s}
                    className={`badge badge-secondary ${selectedSymbol === s ? "active" : ""}`}
                    style={{
                      fontSize: "0.6rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      border:
                        selectedSymbol === s
                          ? "1px solid var(--accent-primary)"
                          : "1px solid transparent",
                    }}
                    onClick={() => assignSymbol(s)}
                    title={`Open ${s} in chart ${activeChartNumber}`}
                  >
                    {s}{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(s);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "0.9rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>

          <div className="flex gap-8 items-center">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${showWatchlist ? "active" : ""}`}
              onClick={() => setShowWatchlist((visible) => !visible)}
              title={showWatchlist ? "Hide watchlist panel" : "Show watchlist panel"}
              aria-pressed={showWatchlist}
            >
              📋 {showWatchlist ? "Hide Watchlist" : "Watchlist"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={toggleFullscreen}
              title={chartFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
            >
              {chartFullscreen ? "↙ Exit Fullscreen" : "⛶ Fullscreen"}
            </button>
          </div>
        </div>

        {toast && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              padding: "12px 24px",
              background: toast.type === "success" ? "var(--profit)" : "var(--loss)",
              color: "white",
              borderRadius: "8px",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              fontWeight: 600,
              animation: "slideIn 0.3s ease-out",
            }}
          >
            {toast.message}
          </div>
        )}

        <div
          className="page-body"
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "calc(100vh - 120px)" }}
        >
          <div
            id="live-chart-container"
            ref={chartContainerRef}
            className="chart-workspace"
          >
            <div className="chart-workspace-toolbar">
              <div
                className="flex gap-8 items-center"
                style={{ flex: 1, overflowX: "auto", paddingBottom: "4px" }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  📁 Projects:
                </span>
                {projects.length === 0 ? (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    No saved projects yet
                  </span>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className={`badge ${
                        selectedProjectId === p.id ? "badge-primary" : "badge-secondary"
                      }`}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.7rem",
                        padding: "4px 10px",
                        border:
                          selectedProjectId === p.id
                            ? "1px solid var(--accent-primary)"
                            : "1px solid transparent",
                      }}
                      onClick={() => handleProjectOpen(p)}
                      title={`Open ${p.symbol} in chart ${activeChartNumber}`}
                    >
                      <span>
                        📁 {p.name} ({p.symbol})
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(p.id);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(255,255,255,0.4)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "1rem",
                          lineHeight: 1,
                        }}
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
                  style={{
                    width: "160px",
                    padding: "4px 8px",
                    fontSize: "0.7rem",
                    height: "28px",
                    borderRadius: "4px",
                  }}
                  placeholder="Project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={createProject}
                  style={{ height: "28px", fontSize: "0.7rem" }}
                >
                  💾 Save Project
                </button>
              </div>
            </div>

            <div className="chart-body">
              <div className={`chart-grid chart-grid-${layout}`}>
                {visiblePanes.map((pane, index) => {
                const isActive = activePane?.id === pane.id;
                const isCompact = layout > 1;
                return (
                  <div
                    key={pane.id}
                    className={`chart-pane ${isActive ? "active" : ""}`}
                    onMouseDown={() => setActivePaneId(pane.id)}
                    onMouseEnter={() => setActivePaneId(pane.id)}
                  >
                    <div className="chart-pane-header">
                      <span
                        className="chart-pane-index"
                        title={isActive ? `Chart ${index + 1} (active)` : `Click to activate chart ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                      <PaneSymbolInput
                        value={pane.symbol}
                        onCommit={(symbol) => assignSymbol(symbol, null, pane.id)}
                      />
                      <select
                        className="chart-pane-timeframe"
                        value={pane.interval}
                        onChange={(e) =>
                          updatePane(pane.id, { interval: e.target.value as ChartInterval })
                        }
                        title="Chart timeframe"
                        aria-label={`Chart ${index + 1} timeframe`}
                      >
                        {CHART_TIMEFRAMES.map((timeframe) => (
                          <option key={timeframe.value} value={timeframe.value}>
                            {timeframe.label}
                          </option>
                        ))}
                      </select>
                      <span
                        className="chart-pane-feed"
                        title="TradingView feed — real-time for crypto/FX, delayed for some stocks"
                      >
                        ●
                      </span>
                    </div>

                    <div className="chart-pane-widget">
                      <AdvancedRealTimeChart
                        key={`${pane.id}-${pane.symbol}-${pane.interval}-${isCompact ? "compact" : "full"}`}
                        theme="dark"
                        symbol={pane.symbol}
                        interval={pane.interval}
                        timezone="Etc/UTC"
                        style="1"
                        locale="en"
                        enable_publishing={false}
                        allow_symbol_change={false}
                        hide_side_toolbar={isCompact}
                        withdateranges={!isCompact}
                        save_image={true}
                        details={!isCompact}
                        hotlist={!isCompact}
                        calendar={!isCompact}
                        show_popup_button={!isCompact}
                        // @ts-ignore
                        countdown={true}
                        container_id={`monstah_tradingview_chart_${pane.id}`}
                        autosize
                      />
                      {loadingPaneId === pane.id && (
                        <div className="chart-pane-loading">
                          <span className="spinner" />
                          <span>Loading {pane.symbol}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>

              {showWatchlist && (
                <aside className="chart-watchlist" aria-label="Watchlist">
                  <div className="watchlist-header">
                    <span className="watchlist-title">★ Watchlist</span>
                    <span className="watchlist-count">{watchlist.length}</span>
                    <button
                      type="button"
                      className="watchlist-close"
                      onClick={() => setShowWatchlist(false)}
                      title="Hide watchlist"
                      aria-label="Hide watchlist"
                    >
                      ×
                    </button>
                  </div>

                  <form className="watchlist-add" onSubmit={addToWatchlist}>
                    <input
                      className="watchlist-add-input"
                      placeholder="Add symbol..."
                      value={newSymbol}
                      onChange={(event) => setNewSymbol(event.target.value)}
                      disabled={isUpdatingWatchlist}
                      spellCheck={false}
                      aria-label="Add symbol to watchlist"
                    />
                    <button
                      type="submit"
                      className="watchlist-add-btn"
                      disabled={isUpdatingWatchlist}
                      title="Add to watchlist"
                    >
                      +
                    </button>
                  </form>

                  <div className="watchlist-list">
                    {watchlist.length === 0 ? (
                      <p className="watchlist-empty">
                        No symbols yet. Add one above or click a project.
                      </p>
                    ) : (
                      watchlist.map((symbol) => {
                        const { exchange, ticker } = splitChartSymbol(symbol);
                        const quote = quotes[symbol];
                        const changePercent = quote?.changePercent ?? null;
                        const changeClass =
                          changePercent === null
                            ? ""
                            : changePercent >= 0
                              ? "up"
                              : "down";
                        return (
                          <div
                            key={symbol}
                            className={`watchlist-row ${
                              selectedSymbol === symbol ? "active" : ""
                            }`}
                            onClick={() => assignSymbol(symbol)}
                            title={`Open ${symbol} in chart ${activeChartNumber}`}
                          >
                            <div className="watchlist-ident">
                              <span className="watchlist-ticker">{ticker}</span>
                              <span className="watchlist-exchange">{exchange}</span>
                            </div>
                            <div className="watchlist-quote">
                              <span className="watchlist-price">
                                {formatQuotePrice(quote?.price)}
                              </span>
                              <span className={`watchlist-change ${changeClass}`}>
                                {formatQuoteChange(changePercent)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="watchlist-remove"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeFromWatchlist(symbol);
                              }}
                              title={`Remove ${symbol}`}
                              aria-label={`Remove ${symbol} from watchlist`}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="watchlist-footer">
                    Prices refresh every 5s · click a row to load it
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
