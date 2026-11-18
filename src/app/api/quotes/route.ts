import { NextResponse } from "next/server";

interface Quote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
}

const CACHE_TTL_MS = 4_000;
const cache = new Map<string, { quote: Quote; expires: number }>();

// Yahoo Finance has no spot metals/energy symbols, so map to their futures.
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
  SPX: "^GSPC",
  SPX500: "^GSPC",
  US500: "^GSPC",
  NDX: "^NDX",
  NAS100: "^NDX",
  US100: "^NDX",
  DJI: "^DJI",
  US30: "^DJI",
  RUT: "^RUT",
  VIX: "^VIX",
  DXY: "^DXY",
};

/**
 * Best-effort mapping from TradingView-style symbols to Yahoo Finance symbols.
 * Unknown symbols fall back to the raw ticker so stocks generally work.
 */
function toYahooSymbol(tvSymbol: string): string | null {
  const trimmed = tvSymbol.trim().toUpperCase();
  if (!trimmed) return null;

  const [exchange, raw] = trimmed.includes(":")
    ? trimmed.split(":")
    : [null, trimmed];
  const symbol = raw || trimmed;
  const compact = symbol.replace(/[^A-Z0-9]/g, "");

  if (exchange === "BINANCE") {
    if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}-USD`;
    if (symbol.endsWith("USDC")) return `${symbol.slice(0, -4)}-USD`;
    if (symbol.endsWith("BTC")) return `${symbol.slice(0, -3)}-BTC`;
    if (symbol.endsWith("ETH")) return `${symbol.slice(0, -3)}-ETH`;
    return `${symbol}-USD`;
  }

  if (
    exchange === "FX" ||
    exchange === "OANDA" ||
    exchange === "ICMARKETS" ||
    exchange === "FOREXCOM" ||
    exchange === "SAXO"
  ) {
    if (COMMODITY_MAP[compact]) return COMMODITY_MAP[compact];
    if (/^[A-Z]{6}$/.test(compact)) return `${compact}=X`;
    return `${compact}=X`;
  }

  if (exchange === "INDEX" || exchange === "TVC" || exchange === "SP") {
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

    const price =
      typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const previousClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : null;

    const change =
      price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent =
      change !== null && previousClose
        ? (change / previousClose) * 100
        : null;

    return {
      price,
      change,
      changePercent,
      currency: typeof meta.currency === "string" ? meta.currency : null,
    };
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
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

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

  return NextResponse.json(
    { quotes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
