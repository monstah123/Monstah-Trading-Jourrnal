# MONSTAH-TV-MULTIPANE-BLUEPRINT v1.0

**Codename:** TV-MULTIPANE-ONE
**Purpose:** Step-by-step implementation blueprint for adding TradingView chart widgets, a 1/2/4 multi-chart workspace, and a right-side live watchlist panel to a web app.
**Reference stack:** Next.js 15 (App Router) · React 19 · TypeScript · `react-ts-tradingview-widgets`
**Last updated:** 2026-11-18

---

## How to use this blueprint with an LLM

Paste this entire document into the LLM and prepend:

> Implement the MONSTAH-TV-MULTIPANE-BLUEPRINT v1.0 (codename TV-MULTIPANE-ONE) in my app. Follow sections 2–13 in order. Adapt storage/auth to my app's existing patterns. Do not invent new dependencies beyond section 2.

Everything below is framework-level guidance plus working reference code that has been verified in production.

---

## 0. What this blueprint builds

1. **TradingView chart widget** embedded natively in the app (real-time chart data comes from TradingView's own feed).
2. **Multi-chart workspace** with 1, 2, or 4 independent panes, each with its own symbol and timeframe.
3. **Per-user persistence** of layout, pane symbols, timeframes, and active pane.
4. **Right-side watchlist panel** styled like TradingView: symbol, exchange, live price, % change, click-to-load, add/remove.
5. **Real-time quote polling** via a server-side Yahoo Finance proxy (5-second cadence, background-tab aware).
6. **Fullscreen workspace** support.
7. **Responsive behavior** for tablet/mobile.

### Important distinction: two different "real-time" sources

| Feature | Data source | Real-time behavior |
|---|---|---|
| TradingView chart panes | TradingView widget (`AdvancedRealTimeChart`) | TradingView streams its own data; crypto/FX real-time, US stocks delayed ~15 min unless the viewer's TradingView plan upgrades the feed. We do not fetch chart data. |
| Watchlist price + % | Our `/api/quotes` proxy → Yahoo Finance | Polled every 5 seconds. Not tick-level. Green/red % recalculates each poll. |
| True tick-level watchlist | TradingView's own site/app | Click the TradingView attribution logo in the chart's lower-left corner — it opens the symbol on TradingView with its native live feed. |
| Tick-level inside our UI (optional) | Unofficial TradingView WebSocket | See section 8.4. Fragile/unofficial; keep polling as fallback. |

---

## 1. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────┐
│ Chart page (client component)                                │
│                                                              │
│  Header: "Live Chart" [Charts: 1 | 2 | 4] [Watchlist] [⛶]   │
│                                                              │
│  ┌──────────────────────────────────────┬─────────────────┐  │
│  │ chart-body (flex row)                │ chart-watchlist │  │
│  │                                      │ (272px)         │  │
│  │  ┌───────────┬───────────┐           │ ★ Watchlist  9  │  │
│  │  │ pane-1    │ pane-2    │           │ [Add symbol +] │  │
│  │  │ TradingView│ TradingView│          │ EURUSD  1.0983 │  │
│  │  │ iframe    │ iframe    │           │ FX     -0.17%  │  │
│  │  ├───────────┼───────────┤           │ BTCUSD 63080   │  │
│  │  │ pane-3    │ pane-4    │           │ BINANCE -2.77% │  │
│  │  └───────────┴───────────┘           │ ...            │  │
│  └──────────────────────────────────────┴─────────────────┘  │
│                                                              │
│  Quotes poller: GET /api/quotes?symbols=... every 5s         │
└──────────────────────────────────────────────────────────────┘
```

**Key principles**

- The chart widget is an **iframe**, not React-rendered chart data. It manages its own connection and rendering.
- Every pane needs a **unique, stable `container_id`**.
- Symbol/interval changes require a **React `key` change** to remount the widget.
- Watchlist quotes are a **separate system** from the charts (Yahoo proxy + polling).
- Persist workspace state in `localStorage` **per user ID** and guard hydration so defaults don't overwrite saved state.

---

## 2. Prerequisites & install

Dependencies used in the reference app:

```bash
npm install react-ts-tradingview-widgets
# already required by Next.js app: react, react-dom, next, typescript
```

No API key is required for the TradingView widget or the Yahoo quotes proxy.

Files you will create or modify:

| File | Purpose |
|---|---|
| `src/types/chart.ts` (or existing types file) | `ChartLayout`, `ChartInterval`, `ChartPane`, `ChartWorkspace` |
| `src/lib/chart.ts` | defaults, layout list, timeframes, symbol normalizer |
| `src/lib/storage.ts` | load/save workspace in localStorage per user |
| `src/app/chart/page.tsx` | chart page: layout switch, panes, watchlist panel |
| `src/app/globals.css` | grid, panes, watchlist styles |
| `src/app/api/quotes/route.ts` | Yahoo Finance quote proxy |

---

## 3. Data model (copy these types)

```ts
// types
export type ChartLayout = 1 | 2 | 4;

export type ChartInterval =
  | "1" | "3" | "5" | "15" | "30" | "60" | "120" | "180" | "240" | "D" | "W";

export interface ChartPane {
  id: string;              // stable unique id, e.g. "pane-1"
  symbol: string;          // TradingView format, e.g. "NASDAQ:AAPL"
  interval: ChartInterval; // TradingView interval string
}

export interface ChartWorkspace {
  layout: ChartLayout;
  panes: ChartPane[];      // always keep 4 slots so layouts restore
  activePaneId: string;    // pane that watchlist clicks load into
}
```

**Critical rule:** always keep **4 pane slots** in state even when the layout is 1 or 2. Switching layout must not destroy the hidden panes' symbols.

---

## 4. Widget integration (real-time charts)

### 4.1 SSR-safe dynamic import

TradingView widgets touch `window`; import them client-side only.

```tsx
"use client";

import dynamic from "next/dynamic";

const AdvancedRealTimeChart = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false }
);
```

### 4.2 Widget call (one per pane)

```tsx
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
  countdown={true}                                  // @ts-ignore if types lag
  container_id={`myapp_tradingview_chart_${pane.id}`} // MUST be unique per pane
  autosize
/>
```

### 4.3 Prop reference

| Prop | Meaning | Notes |
|---|---|---|
| `symbol` | TradingView symbol (`EXCHANGE:TICKER`) | e.g. `FX:EURUSD`, `BINANCE:BTCUSDT`, `NASDAQ:AAPL` |
| `interval` | `"1"`, `"5"`, `"15"`, `"30"`, `"60"`, `"240"`, `"D"`, `"W"` | Match your `ChartInterval` union |
| `theme` | `"dark"` / `"light"` | Use app theme |
| `style` | `"1"` candles, `"8"` area, etc. | TradingView style enum |
| `autosize` | Widget fills its container | Required for grid layouts |
| `container_id` | DOM id for the iframe container | **Unique per pane** or charts overwrite each other |
| `hide_side_toolbar` | Hide drawing toolbar | Set `true` in compact (multi-pane) mode |
| `withdateranges`, `details`, `hotlist`, `calendar`, `show_popup_button` | Extra TradingView UI | Disable in compact mode to save space |
| `allow_symbol_change` | Show TradingView's own symbol search | Keep `false` when your app controls the symbol |
| `save_image` | Screenshot button | Keep `true` |
| `countdown` | Bar close countdown | May need `@ts-ignore` depending on library version |
| `watchlist` | TradingView's **built-in** watchlist sidebar | **Not reliable**: in the reference app it did not render consistently. Use the custom panel in section 6 instead, and omit this prop. |

### 4.4 Remount rules (the most common bug source)

1. **Changing `symbol` or `interval` does not update the iframe by itself.** Change the React `key` (as above) so React destroys and recreates the widget.
2. **Changing layout changes widget props** (`hide_side_toolbar`, `withdateranges`, etc.), so include `compact`/`full` in the key to force a clean remount.
3. **After layout changes**, dispatch a resize event so TradingView recalculates iframe size:

```ts
setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
```

4. **Do not reuse `container_id` across panes.** Use `${pane.id}`.

---

## 5. Multi-chart workspace

### 5.1 Constants and helpers

```ts
// src/lib/chart.ts
import { ChartInterval, ChartLayout, ChartPane } from "@/types/chart";

export const DEFAULT_CHART_SYMBOL = "ICMARKETS:EURUSD";

export const DEFAULT_CHART_PANES: ChartPane[] = [
  { id: "pane-1", symbol: DEFAULT_CHART_SYMBOL, interval: "60" },
  { id: "pane-2", symbol: "BINANCE:BTCUSDT", interval: "60" },
  { id: "pane-3", symbol: "OANDA:XAUUSD", interval: "60" },
  { id: "pane-4", symbol: "NASDAQ:TSLA", interval: "60" },
];

export const CHART_LAYOUTS: ChartLayout[] = [1, 2, 4];

export const CHART_TIMEFRAMES: Array<{ label: string; value: ChartInterval }> = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
];

export const CHART_INTERVALS: ChartInterval[] = CHART_TIMEFRAMES.map((t) => t.value);

export function isChartInterval(value: unknown): value is ChartInterval {
  return typeof value === "string" && CHART_INTERVALS.includes(value as ChartInterval);
}

/** Accepts user shortcuts and returns an EXCHANGE:SYMBOL string. */
export function normalizeChartSymbol(raw: string): string {
  let symbol = raw.trim().toUpperCase();
  if (!symbol) return "";
  if (!symbol.includes(":")) {
    if (["BTCUSD", "ETHUSD", "SOLUSD"].includes(symbol)) {
      symbol = `BINANCE:${symbol}`;
    } else if (symbol.length === 6) {
      symbol = `FX:${symbol}`;
    }
  }
  return symbol;
}
```

### 5.2 Page state

```tsx
const [layout, setLayout] = useState<ChartLayout>(1);
const [panes, setPanes] = useState<ChartPane[]>(() =>
  DEFAULT_CHART_PANES.map((pane) => ({ ...pane }))
);
const [activePaneId, setActivePaneId] = useState(DEFAULT_CHART_PANES[0].id);
const [loadingPaneId, setLoadingPaneId] = useState<string | null>(null);
const workspaceHydrated = useRef(false);

const visiblePanes = panes.slice(0, layout);
const activePane =
  visiblePanes.find((pane) => pane.id === activePaneId) ?? visiblePanes[0];
const selectedSymbol = activePane?.symbol ?? DEFAULT_CHART_PANES[0].symbol;
```

Layout changer:

```tsx
const changeLayout = (nextLayout: ChartLayout) => {
  setLayout(nextLayout);
  // If the active pane is no longer visible, fall back to pane 1
  if (!panes.slice(0, nextLayout).some((pane) => pane.id === activePaneId)) {
    setActivePaneId(panes[0].id);
  }
  // Let TradingView recalculate iframe sizes
  setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
};
```

Update/assignment helpers:

```tsx
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
  setSelectedProjectId(projectId); // optional: clear/open saved project
  showPaneLoading(paneId);         // optional: 1.2s spinner overlay
};
```

### 5.3 Per-user persistence

```ts
// src/lib/storage.ts
const CHART_WORKSPACE_KEY = "myapp_chart_workspace";

export async function getChartWorkspace(userId: string): Promise<ChartWorkspace | null> {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const saved = localStorage.getItem(`${CHART_WORKSPACE_KEY}_${userId}`);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<ChartWorkspace> | null;
    if (!parsed || !Array.isArray(parsed.panes)) return null;

    const layout = parsed.layout === 2 || parsed.layout === 4 ? parsed.layout : 1;
    const seenIds = new Set<string>();

    const panes: ChartPane[] = (parsed.panes as Array<Partial<ChartPane> | null>)
      .filter((pane): pane is Partial<ChartPane> =>
        !!pane && typeof pane.symbol === "string" && pane.symbol.trim().length > 0
      )
      .map((pane, index) => {
        let id = typeof pane.id === "string" && pane.id ? pane.id : `pane-${index + 1}`;
        while (seenIds.has(id)) id = `${id}-${index + 1}`;
        seenIds.add(id);
        return {
          id,
          symbol: (pane.symbol as string).trim(),
          interval: isChartInterval(pane.interval) ? pane.interval : "60",
        };
      })
      .slice(0, DEFAULT_CHART_PANES.length);

    // Always keep four slots so hidden layouts restore
    while (panes.length < DEFAULT_CHART_PANES.length) {
      const fallback = DEFAULT_CHART_PANES[panes.length];
      let id = fallback.id;
      let suffix = 2;
      while (panes.some((pane) => pane.id === id)) id = `${fallback.id}-${suffix++}`;
      panes.push({ ...fallback, id });
    }

    const activePaneId =
      typeof parsed.activePaneId === "string" &&
      panes.slice(0, layout).some((pane) => pane.id === parsed.activePaneId)
        ? parsed.activePaneId
        : panes[0].id;

    return { layout, panes, activePaneId };
  } catch (error) {
    console.error("Error fetching chart workspace:", error);
    return null;
  }
}

export async function saveChartWorkspace(
  userId: string,
  workspace: ChartWorkspace,
): Promise<void> {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(`${CHART_WORKSPACE_KEY}_${userId}`, JSON.stringify(workspace));
}
```

Hydration guard (prevents defaults from overwriting saved state on first render):

```tsx
const workspaceHydrated = useRef(false);

useEffect(() => {
  if (!user) return;
  let cancelled = false;
  workspaceHydrated.current = false;

  (async () => {
    const workspace = await getChartWorkspace(user.uid);
    if (cancelled) return;
    if (workspace) {
      setLayout(workspace.layout);
      setPanes(workspace.panes);
      setActivePaneId(workspace.activePaneId);
    }
    workspaceHydrated.current = true;
  })();

  return () => { cancelled = true; };
}, [user]);

useEffect(() => {
  if (!user || !workspaceHydrated.current) return;
  saveChartWorkspace(user.uid, { layout, panes, activePaneId });
}, [user, layout, panes, activePaneId]);
```

### 5.4 CSS grid

```css
.chart-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  background: var(--bg-card);
}

.chart-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.chart-grid {
  flex: 1;
  display: grid;
  gap: 6px;
  padding: 6px;
  min-height: 0;
  min-width: 0;
}

.chart-grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.chart-grid-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
.chart-grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

.chart-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-card);
}

.chart-pane.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--accent-primary);
}

.chart-pane-widget {
  position: relative;
  flex: 1;
  min-height: 0;
}

@media (max-width: 900px) {
  .chart-grid-1, .chart-grid-2, .chart-grid-4 {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-rows: minmax(380px, 60vh);
  }
  .chart-workspace, .chart-grid { flex: none; }
  .chart-workspace { overflow: visible; }
}
```

**Height chain rule:** every ancestor from the page body down to `.chart-pane-widget` must have a resolved height (`flex: 1` + `min-height: 0`). Without `min-height: 0`, TradingView iframes collapse to 0px.

---

## 6. Right-side watchlist panel

### 6.1 Panel JSX (inside `.chart-body`, after the grid)

```tsx
<aside className="chart-watchlist" aria-label="Watchlist">
  <div className="watchlist-header">
    <span className="watchlist-title">★ Watchlist</span>
    <span className="watchlist-count">{watchlist.length}</span>
    <button className="watchlist-close" onClick={() => setShowWatchlist(false)}>×</button>
  </div>

  <form className="watchlist-add" onSubmit={addToWatchlist}>
    <input
      className="watchlist-add-input"
      placeholder="Add symbol..."
      value={newSymbol}
      onChange={(e) => setNewSymbol(e.target.value)}
      spellCheck={false}
    />
    <button type="submit" className="watchlist-add-btn">+</button>
  </form>

  <div className="watchlist-list">
    {watchlist.map((symbol) => {
      const { exchange, ticker } = splitChartSymbol(symbol);
      const quote = quotes[symbol];
      const changePercent = quote?.changePercent ?? null;
      const changeClass =
        changePercent === null ? "" : changePercent >= 0 ? "up" : "down";

      return (
        <div
          key={symbol}
          className={`watchlist-row ${selectedSymbol === symbol ? "active" : ""}`}
          onClick={() => assignSymbol(symbol)}
        >
          <div className="watchlist-ident">
            <span className="watchlist-ticker">{ticker}</span>
            <span className="watchlist-exchange">{exchange}</span>
          </div>
          <div className="watchlist-quote">
            <span className="watchlist-price">{formatQuotePrice(quote?.price)}</span>
            <span className={`watchlist-change ${changeClass}`}>
              {formatQuoteChange(changePercent)}
            </span>
          </div>
          <button
            className="watchlist-remove"
            onClick={(e) => {
              e.stopPropagation();
              removeFromWatchlist(symbol);
            }}
          >×</button>
        </div>
      );
    })}
  </div>

  <div className="watchlist-footer">
    Prices refresh every 5s · click a row to load it
  </div>
</aside>
```

Helpers:

```ts
function splitChartSymbol(symbol: string): { exchange: string; ticker: string } {
  const [exchange, ...rest] = symbol.split(":");
  if (rest.length === 0) return { exchange: "—", ticker: symbol };
  return { exchange, ticker: rest.join(":") };
}

function formatQuotePrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return "—";
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

function formatQuoteChange(changePercent: number | null | undefined): string {
  if (changePercent === null || changePercent === undefined || !Number.isFinite(changePercent)) return "—";
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}
```

### 6.2 Panel behavior rules

- **Click row → `assignSymbol(symbol)`** so it loads into the **active pane** (not always pane 1).
- **Active symbol highlight:** compare `selectedSymbol` (from the active pane) to the row symbol.
- **Add/remove** operates on the same persisted watchlist as the header chips.
- **Toggle** with a header button (`showWatchlist` state), and a `×` in the panel header.
- **Responsive:** below ~1100px, make the panel an absolute overlay:

```css
@media (max-width: 1100px) {
  .chart-watchlist {
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: min(300px, 88vw);
    z-index: 30;
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.45);
  }
}
```

### 6.3 Panel CSS essentials

```css
.chart-watchlist {
  width: 272px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.watchlist-list { flex: 1; min-height: 0; overflow-y: auto; }

.watchlist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  border-left: 2px solid transparent;
}
.watchlist-row:hover { background: var(--bg-card-hover); }
.watchlist-row.active { background: rgba(108, 92, 231, 0.08); border-left-color: var(--accent-primary); }

.watchlist-ticker { font-family: "JetBrains Mono", monospace; font-size: 0.72rem; font-weight: 700; }
.watchlist-exchange { font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; }
.watchlist-price { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; }
.watchlist-change.up { color: #00e676; }
.watchlist-change.down { color: #ff5252; }
.watchlist-remove { opacity: 0; transition: opacity 0.15s; }
.watchlist-row:hover .watchlist-remove { opacity: 1; }
```

---

## 7. Real-time quotes API (Yahoo Finance proxy)

Browsers can't call Yahoo Finance directly (CORS), so proxy through a server route. This also lets you cache and remap symbols.

### 7.1 Route: `src/app/api/quotes/route.ts`

```ts
import { NextResponse } from "next/server";

interface Quote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
}

const CACHE_TTL_MS = 4_000; // keep below the client poll interval
const cache = new Map<string, { quote: Quote; expires: number }>();

const COMMODITY_MAP: Record<string, string> = {
  XAUUSD: "GC=F",
  GOLD: "GC=F",
  XAGUSD: "SI=F",
  SILVER: "SI=F",
  USOIL: "CL=F",
  WTIUSD: "CL=F",
  UKOIL: "BZ=F",
  NATGAS: "NG=F",
};

const INDEX_MAP: Record<string, string> = {
  SPX: "^GSPC", SPX500: "^GSPC", US500: "^GSPC",
  NDX: "^NDX", NAS100: "^NDX", US100: "^NDX",
  DJI: "^DJI", US30: "^DJI",
  RUT: "^RUT", VIX: "^VIX", DXY: "^DXY",
};

function toYahooSymbol(tvSymbol: string): string | null {
  const trimmed = tvSymbol.trim().toUpperCase();
  if (!trimmed) return null;

  const [exchange, raw] = trimmed.includes(":") ? trimmed.split(":") : [null, trimmed];
  const symbol = raw || trimmed;
  const compact = symbol.replace(/[^A-Z0-9]/g, "");

  if (exchange === "BINANCE") {
    if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}-USD`;
    if (symbol.endsWith("USDC")) return `${symbol.slice(0, -4)}-USD`;
    if (symbol.endsWith("BTC")) return `${symbol.slice(0, -3)}-BTC`;
    if (symbol.endsWith("ETH")) return `${symbol.slice(0, -3)}-ETH`;
    return `${symbol}-USD`;
  }

  if (["FX", "OANDA", "ICMARKETS", "FOREXCOM", "SAXO"].includes(exchange ?? "")) {
    if (COMMODITY_MAP[compact]) return COMMODITY_MAP[compact];
    if (/^[A-Z]{6}$/.test(compact)) return `${compact}=X`;
    return `${compact}=X`;
  }

  if (["INDEX", "TVC", "SP"].includes(exchange ?? "")) {
    if (INDEX_MAP[symbol]) return INDEX_MAP[symbol];
    return symbol;
  }

  return symbol;
}

async function fetchQuote(yahooSymbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=1d&range=1d`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const previousClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : null;

    const change = price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;

    return { price, change, changePercent, currency: typeof meta.currency === "string" ? meta.currency : null };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (symbols.length === 0) return NextResponse.json({ quotes: {} });

  const now = Date.now();
  const quotes: Record<string, Quote | null> = {};
  const pending: Array<Promise<void>> = [];

  for (const symbol of symbols) {
    const cached = cache.get(symbol);
    if (cached && cached.expires > now) {
      quotes[symbol] = cached.quote;
      continue;
    }

    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      quotes[symbol] = null;
      continue;
    }

    pending.push(
      fetchQuote(yahooSymbol).then((quote) => {
        quotes[symbol] = quote;
        if (quote) cache.set(symbol, { quote, expires: Date.now() + CACHE_TTL_MS });
      }),
    );
  }

  await Promise.all(pending);
  return NextResponse.json({ quotes }, { headers: { "Cache-Control": "no-store" } });
}
```

### 7.2 Client poller (5 seconds, background-aware)

```tsx
const [quotes, setQuotes] = useState<Record<string, WatchlistQuote | null>>({});

useEffect(() => {
  if (!watchlist.length) {
    setQuotes({});
    return;
  }

  let cancelled = false;

  const loadQuotes = async () => {
    // Don't burn rate limit while the tab is hidden
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
```

### 7.3 Symbol mapping table

| App symbol | Yahoo symbol | Notes |
|---|---|---|
| `FX:EURUSD` | `EURUSD=X` | 6-letter pairs |
| `OANDA:XAUUSD` | `GC=F` | Yahoo has **no spot gold**; futures proxy |
| `OANDA:XAGUSD` | `SI=F` | Silver futures |
| `BINANCE:BTCUSDT` | `BTC-USD` | Strip `USDT`, append `-USD` |
| `BINANCE:ETHUSDT` | `ETH-USD` | same rule |
| `NASDAQ:AAPL` / `AMEX:SPY` | `AAPL` / `SPY` | strip exchange |
| `TVC:SPX` / `INDEX:NDX` | `^GSPC` / `^NDX` | index map |
| `USOIL` / `CL` | `CL=F` | crude futures |

### 7.4 Limits & fallbacks

- Yahoo may return 429/404. The UI must render `—` for missing prices and recover on the next poll.
- 5s × N symbols can hit rate limits. Mitigations: 4s server cache, skip hidden tabs, cap symbols at 40.
- If you need guaranteed tick data, use a paid market-data API, or see section 8.4.

---

## 8. Real-time options compared

### 8.1 TradingView widget (charts) — recommended

- Real-time feed included, no API key.
- Handles symbol search, drawing tools, indicators, fullscreen, screenshot.
- Feed latency depends on exchange + viewer's TradingView plan (US stocks often delayed).
- Attribution logo (lower-left) links to TradingView where the user can see true live data.

### 8.2 Yahoo polling (watchlist) — implemented

- Simple, no key, works for FX/crypto/stocks/indices/futures proxies.
- 5-second refresh is "near real-time", not tick-level.
- Subject to unofficial-endpoint rate limits.

### 8.3 TradingView MarketQuotes widget (alternative)

- Embed TradingView's own quotes widget for true TradingView prices.
- Tradeoff: it's a second iframe; clicking a row opens TradingView, not your chart.
- Good choice if you only need display, not click-to-load.

### 8.4 Unofficial TradingView WebSocket (tick-level, advanced)

- Connect to `wss://data.tradingview.com/socket.io/websocket`, send `quote_create_session` + `quote_add_symbols`, parse `qsd` frames for `lp` (last), `ch` (change), `chp` (change %).
- Gives the same feed as the chart widget.
- Undocumented and can change without notice — must keep polling fallback.
- Only pursue if tick-level updates inside your own UI are a hard requirement.

---

## 9. Implementation order (do it in this sequence)

1. **Install** `react-ts-tradingview-widgets`.
2. **Add types** (`ChartLayout`, `ChartInterval`, `ChartPane`, `ChartWorkspace`).
3. **Add `lib/chart.ts`** with defaults, timeframes, layout list, symbol normalizer.
4. **Render one TradingView widget** in the target page with `dynamic(..., { ssr: false })`, `autosize`, unique `container_id`. Verify it appears.
5. **Add layout state + switcher** (1/2/4) and a 4-slot `panes` array. Render `visiblePanes = panes.slice(0, layout)`.
6. **Add pane header controls**: symbol input (commit on Enter/blur, Escape cancels), timeframe `<select>`. Remount widget via key.
7. **Add CSS grid** for 1/2/4 + responsive rules + height chain (`min-height: 0`).
8. **Add persistence**: `getChartWorkspace` / `saveChartWorkspace` with hydration guard and 4-slot padding.
9. **Add active-pane tracking** (`onMouseDown` / `onMouseEnter`) and highlight.
10. **Build the watchlist panel** on the right of `.chart-body`; reuse existing watchlist state; click loads into active pane.
11. **Add `/api/quotes` proxy** with symbol mapping + cache.
12. **Add the 5s poller** with visibility handling.
13. **Add toggle + mobile overlay** behavior.
14. **Fullscreen**: `requestFullscreen()` on the workspace container; listen for `fullscreenchange`.
15. **Run production build** and the acceptance tests in section 11.

---

## 10. Pitfall checklist

- [ ] Widget imported with `ssr: false` (otherwise `window is not defined`).
- [ ] `container_id` unique per pane (`pane.id`).
- [ ] React `key` includes symbol **and** interval **and** compact/full mode.
- [ ] Resize event dispatched after layout changes.
- [ ] Every flex ancestor has `min-height: 0` / `min-width: 0`; chart containers need explicit height.
- [ ] Workspace state hydrated **before** the persist effect overwrites it (`workspaceHydrated` ref).
- [ ] Always keep 4 panes in storage even with layout 1 or 2.
- [ ] Active pane reset when it becomes invisible after a layout change.
- [ ] Watchlist click uses the **active** pane, not always pane 1.
- [ ] Quote rows handle `null` price (`—`) without breaking.
- [ ] Poll skips hidden tabs; refresh immediately on visibility return.
- [ ] Server cache TTL < client poll interval (4s vs 5s).
- [ ] No API clients created at module scope in route handlers (build-time crash when env vars missing) — instantiate lazily inside `POST`/`GET`.
- [ ] Read-only users: panel and layout switcher still work without auth changes.
- [ ] Mobile: panel overlays instead of shrinking charts below usable width.
- [ ] Turbopack/webpack: if a dependency resolves in Node but not in the bundler, do a clean reinstall (partial installs from out-of-disk errors truncate files).

---

## 11. Acceptance tests

1. Page loads one chart with the default symbol; no SSR errors.
2. Switch **1 → 2 → 4**: correct number of panes; each keeps its own symbol/timeframe.
3. Type `NASDAQ:AAPL` in pane 2 → Enter → pane 2 remounts on AAPL; pane 1 unaffected.
4. Change pane 3 timeframe to 4h → persists after reload.
5. Reload the page → layout, all four pane symbols, timeframes, active pane restored.
6. Click a watchlist row → symbol loads into the **active** pane and the row highlights.
7. Add `GBPUSD` in the panel → becomes `FX:GBPUSD`, appears in the list, quote populates.
8. Remove a symbol with × → gone from panel and header chips; stays gone after reload.
9. Prices/% update within ~5 seconds; green for positive, red for negative.
10. Switch tabs for a minute → no polling; on return, prices refresh immediately.
11. Toggle watchlist → charts expand/collapse; layout unaffected.
12. Fullscreen → workspace fills screen; exit restores.
13. Mobile width (~390px) → charts stack; watchlist overlays; toggle still works.
14. `npm run build` passes with zero type errors.

---

## 12. Reference file map (Monstah app)

| File | Contents |
|---|---|
| `src/app/chart/page.tsx` | Page, layout switcher, panes, watchlist panel, quote poller, fullscreen |
| `src/lib/chart.ts` | Defaults, timeframes, layouts, `normalizeChartSymbol` |
| `src/lib/storage.ts` | Watchlist, projects, workspace load/save (localStorage per user) |
| `src/types/trade.ts` | `ChartLayout`, `ChartInterval`, `ChartPane`, `ChartWorkspace`, `ChartProject` |
| `src/app/api/quotes/route.ts` | Yahoo proxy with mapping + cache |
| `src/app/globals.css` | `.chart-workspace`, `.chart-body`, `.chart-grid-*`, `.chart-pane*`, `.chart-watchlist*` |

---

## Appendix A — Changelog of the reference implementation (Nov 17–18, 2026)

| Date | Change | Commit |
|---|---|---|
| 2026-11-17 | Multi-chart workspace: 1/2/4 layouts, per-pane symbol/timeframe, active pane, per-user persistence, responsive CSS | `f2f243f` |
| 2026-11-18 | Visible "Charts:" label for layout-switcher discoverability | `9506777` |
| 2026-11-18 | Right-side watchlist panel with live quotes, click-to-load, add/remove, active highlight, `/api/quotes` Yahoo proxy, commodity/index mapping, mobile overlay | `a81d646` |
| 2026-11-18 | 5-second quote refresh (was 30s), 4s server cache, hidden-tab pause + focus refresh | `b9ff5e3` |
| 2026-11-18 | Build fix: lazy-initialize OpenAI client inside route handler (module-scope client crashed `next build` without `OPENAI_API_KEY`); lockfile refresh after clean reinstall | `a48f021` |

**Earlier chart groundwork (for context):** saved chart projects, symbol-based widget keys, drawing persistence fixes, stable `container_id`, remount-on-symbol-change.

---

## Appendix B — Minimal starting prompt for the target app

> You are implementing the MONSTAH-TV-MULTIPANE-BLUEPRINT v1.0 (TV-MULTIPANE-ONE).
> Target app: [describe stack here].
> Task: add TradingView chart widgets, a 1/2/4 multi-chart workspace with per-pane symbol + timeframe and per-user persistence, plus a right-side watchlist panel with 5-second quote polling through a Yahoo Finance proxy.
> Use the code and rules in this blueprint. Preserve my existing design system and auth/storage patterns. Build incrementally in the section 9 order, verify each step, and finish with the section 11 acceptance tests.

---

*End of blueprint — MONSTAH-TV-MULTIPANE-BLUEPRINT v1.0 (TV-MULTIPANE-ONE)*
