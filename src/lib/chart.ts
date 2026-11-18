import { ChartInterval, ChartLayout, ChartPane } from "@/types/trade";

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

export const CHART_INTERVALS: ChartInterval[] = CHART_TIMEFRAMES.map(
  (timeframe) => timeframe.value
);

export function isChartInterval(value: unknown): value is ChartInterval {
  return typeof value === "string" && CHART_INTERVALS.includes(value as ChartInterval);
}

/**
 * Accepts a raw user input and returns a TradingView-style symbol.
 * Keeps the app's existing shortcuts (EURUSD -> FX:EURUSD, BTCUSD -> BINANCE:BTCUSD)
 * while allowing full EXCHANGE:SYMBOL input.
 */
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
