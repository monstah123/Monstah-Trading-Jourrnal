"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { getTrades } from "@/lib/storage";
import { calculatePortfolioStats, calculateDailyStats } from "@/lib/stats";
import { Trade } from "@/types/trade";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import "../styles/landing.css";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user) {
      getTrades(user.uid).then(setTrades);
    }
  }, [user]);

  const stats = useMemo(
    () => (trades.length > 0 ? calculatePortfolioStats(trades) : null),
    [trades],
  );
  const dailyStats = useMemo(() => calculateDailyStats(trades), [trades]);

  if (!mounted) return null;

  const closedTrades = trades.filter((t) => t.status === "closed");

  // Equity curve
  const equityCurve = dailyStats.reduce(
    (acc: { date: string; equity: number }[], day, i) => {
      const prev = i > 0 ? acc[i - 1].equity : 0;
      acc.push({
        date: day.date,
        equity: Number((prev + day.totalPnl).toFixed(2)),
      });
      return acc;
    },
    [],
  );

  // Win rate by setup
  const setupStats = closedTrades.reduce(
    (acc: Record<string, { wins: number; total: number; pnl: number }>, t) => {
      if (!acc[t.setup]) acc[t.setup] = { wins: 0, total: 0, pnl: 0 };
      acc[t.setup].total++;
      acc[t.setup].pnl += t.pnl ?? 0;
      if ((t.pnl ?? 0) > 0) acc[t.setup].wins++;
      return acc;
    },
    {},
  );

  const setupBarData = Object.entries(setupStats).map(([setup, data]) => ({
    setup: setup.replace("_", " "),
    winRate: Number(((data.wins / data.total) * 100).toFixed(1)),
    pnl: Number(data.pnl.toFixed(2)),
    count: data.total,
  }));

  // Performance by hour
  const hourlyData = closedTrades.reduce(
    (acc: Record<number, { pnl: number; count: number }>, t) => {
      const hour = new Date(t.entryTime).getHours();
      if (!acc[hour]) acc[hour] = { pnl: 0, count: 0 };
      acc[hour].pnl += t.pnl ?? 0;
      acc[hour].count++;
      return acc;
    },
    {},
  );
  const hourlyChartData = Object.entries(hourlyData)
    .map(([hour, data]) => ({
      hour: `${hour}:00`,
      pnl: Number(data.pnl.toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  // Performance by day of week
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowData = closedTrades.reduce(
    (acc: Record<number, { pnl: number; wins: number; total: number }>, t) => {
      const dow = new Date(t.date).getDay();
      if (!acc[dow]) acc[dow] = { pnl: 0, wins: 0, total: 0 };
      acc[dow].pnl += t.pnl ?? 0;
      acc[dow].total++;
      if ((t.pnl ?? 0) > 0) acc[dow].wins++;
      return acc;
    },
    {},
  );
  const dowChartData = dayNames.map((name, i) => ({
    day: name,
    pnl: Number((dowData[i]?.pnl ?? 0).toFixed(2)),
    winRate: dowData[i]
      ? Number(((dowData[i].wins / dowData[i].total) * 100).toFixed(1))
      : 0,
    trades: dowData[i]?.total ?? 0,
  }));

  // Radar chart for skills assessment
  const radarData = [
    { skill: "Win Rate", value: Math.min(stats?.winRate ?? 0, 100) },
    {
      skill: "Profit Factor",
      value: Math.min((stats?.profitFactor ?? 0) * 20, 100),
    },
    {
      skill: "Risk Mgmt",
      value: stats?.maxDrawdownPercent
        ? Math.max(100 - stats.maxDrawdownPercent, 0)
        : 50,
    },
    {
      skill: "Consistency",
      value: Math.min((stats?.bestStreak ?? 0) * 10, 100),
    },
    {
      skill: "Discipline",
      value:
        (closedTrades.filter(
          (t) =>
            t.emotionBefore === "disciplined" || t.emotionBefore === "calm",
        ).length /
          Math.max(closedTrades.length, 1)) *
        100,
    },
    { skill: "R:R Ratio", value: Math.min((stats?.averageRR ?? 0) * 25, 100) },
  ];

  // Risk/Reward scatter
  const scatterData = closedTrades
    .filter((t) => t.riskReward !== null && t.pnl !== null)
    .map((t) => ({
      rr: t.riskReward!,
      pnl: t.pnl!,
      symbol: t.symbol,
      confidence: t.confidence,
    }));

  // Calendar heatmap
  const calendarData = dailyStats.reduce((acc: Record<string, number>, d) => {
    acc[d.date] = d.totalPnl;
    return acc;
  }, {});

  const today = new Date();
  const calendarDays: { date: string; pnl: number | null; day: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    calendarDays.push({
      date: dateStr,
      pnl: calendarData[dateStr] ?? null,
      day: d.getDate(),
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Link href="/" className="pricing-bubble">
           <span>💎</span>
           <span>Pro Plans</span>
        </Link>
        <div className="page-header">
          <h2>Analytics</h2>
          <p>Deep dive into your trading performance</p>
        </div>

        <div className="page-body">
          {trades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h3>No Data Yet</h3>
              <p>
                Start logging trades to unlock powerful analytics and insights.
              </p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Max Drawdown</div>
                  <div className="stat-value loss">
                    -${(stats?.maxDrawdown ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Best Streak</div>
                  <div className="stat-value profit">
                    🔥 {stats?.bestStreak ?? 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Worst Streak</div>
                  <div className="stat-value loss">
                    ❄️ {stats?.worstStreak ?? 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Hold Time</div>
                  <div className="stat-value neutral">
                    {stats?.averageHoldTime ?? "—"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg R:R</div>
                  <div
                    className={`stat-value ${(stats?.averageRR ?? 0) >= 1 ? "profit" : "loss"}`}
                  >
                    {(stats?.averageRR ?? 0).toFixed(2)}R
                  </div>
                </div>
              </div>

              {/* Calendar Heatmap */}
              <div className="card mb-24">
                <div className="card-header">
                  <span className="card-title">🗓️ 90-Day P&L Calendar</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "4px",
                  }}
                >
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: "center",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        padding: "4px",
                      }}
                    >
                      {d}
                    </div>
                  ))}
                  {Array.from({
                    length: new Date(
                      calendarDays[0]?.date || today.toISOString(),
                    ).getDay(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty" />
                  ))}
                  {calendarDays.map((cd) => (
                    <div
                      key={cd.date}
                      className={`calendar-day ${cd.pnl === null ? "neutral" : cd.pnl >= 0 ? "profit" : "loss"}`}
                      title={`${cd.date}: ${cd.pnl !== null ? `$${cd.pnl.toFixed(2)}` : "No trades"}`}
                    >
                      {cd.day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid-2" style={{ marginBottom: "24px" }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">📈 Equity Curve</span>
                  </div>
                  <div style={{ height: "280px" }}>
                    <ResponsiveContainer>
                      <AreaChart data={equityCurve}>
                        <defs>
                          <linearGradient
                            id="eqGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6c5ce7"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6c5ce7"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#13131d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke="#6c5ce7"
                          fill="url(#eqGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">🎯 Win Rate by Setup</span>
                  </div>
                  <div style={{ height: "280px" }}>
                    <ResponsiveContainer>
                      <BarChart data={setupBarData} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="setup"
                          tick={{ fill: "#8888a0", fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#13131d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                          {setupBarData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.winRate >= 50 ? "#00e676" : "#ff5252"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: "24px" }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">📅 P&L by Day of Week</span>
                  </div>
                  <div style={{ height: "280px" }}>
                    <ResponsiveContainer>
                      <BarChart data={dowChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: "#8888a0", fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#13131d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {dowChartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.pnl >= 0 ? "#00e676" : "#ff5252"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">⏰ P&L by Hour</span>
                  </div>
                  <div style={{ height: "280px" }}>
                    <ResponsiveContainer>
                      <BarChart data={hourlyChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="hour"
                          tick={{ fill: "#8888a0", fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#13131d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {hourlyChartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.pnl >= 0 ? "#00cec9" : "#ff7675"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">🕸️ Trading Skills Radar</span>
                  </div>
                  <div style={{ height: "320px" }}>
                    <ResponsiveContainer>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: "#8888a0", fontSize: 11 }}
                        />
                        <Radar
                          name="Skills"
                          dataKey="value"
                          stroke="#6c5ce7"
                          fill="#6c5ce7"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">🎲 Risk/Reward vs P&L</span>
                  </div>
                  <div style={{ height: "320px" }}>
                    <ResponsiveContainer>
                      <ScatterChart>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="rr"
                          name="R:R"
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          label={{
                            value: "Risk/Reward",
                            position: "bottom",
                            fill: "#55556a",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          dataKey="pnl"
                          name="P&L"
                          tick={{ fill: "#55556a", fontSize: 10 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <ZAxis
                          dataKey="confidence"
                          range={[50, 300]}
                          name="Confidence"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#13131d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                          }}
                        />
                        <Scatter data={scatterData} fill="#6c5ce7">
                          {scatterData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.pnl >= 0 ? "#00e676" : "#ff5252"}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
