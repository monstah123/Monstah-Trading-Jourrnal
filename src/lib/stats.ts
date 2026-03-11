import { Trade, DailyStats, PortfolioStats } from "@/types/trade";

export function calculateDailyStats(trades: Trade[]): DailyStats[] {
  const grouped: Record<string, Trade[]> = {};

  trades
    .filter((t) => t.status === "closed")
    .forEach((trade) => {
      const date = trade.date.split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(trade);
    });

  return Object.entries(grouped)
    .map(([date, dayTrades]) => {
      const winners = dayTrades.filter((t) => (t.pnl ?? 0) > 0);
      const losers = dayTrades.filter((t) => (t.pnl ?? 0) < 0);
      const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const avgWin =
        winners.length > 0
          ? winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winners.length
          : 0;
      const avgLoss =
        losers.length > 0
          ? Math.abs(
              losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losers.length,
            )
          : 0;
      const grossWins = winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const grossLosses = Math.abs(
        losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
      );
      const avgRR =
        dayTrades.reduce((sum, t) => sum + (t.riskReward ?? 0), 0) /
        (dayTrades.length || 1);

      return {
        date,
        totalTrades: dayTrades.length,
        winningTrades: winners.length,
        losingTrades: losers.length,
        totalPnl,
        winRate:
          dayTrades.length > 0 ? (winners.length / dayTrades.length) * 100 : 0,
        averageWin: avgWin,
        averageLoss: avgLoss,
        largestWin:
          winners.length > 0 ? Math.max(...winners.map((t) => t.pnl ?? 0)) : 0,
        largestLoss:
          losers.length > 0 ? Math.min(...losers.map((t) => t.pnl ?? 0)) : 0,
        profitFactor:
          grossLosses > 0
            ? grossWins / grossLosses
            : grossWins > 0
              ? Infinity
              : 0,
        averageRR: avgRR,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculatePortfolioStats(trades: Trade[]): PortfolioStats {
  const closedTrades = trades.filter((t) => t.status === "closed");
  const dailyStats = calculateDailyStats(trades);

  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      totalPnl: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      averageRR: 0,
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
      averageHoldTime: "0m",
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      dailyStats,
    };
  }

  const winners = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losers = closedTrades.filter((t) => (t.pnl ?? 0) < 0);
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossWins = winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLosses = Math.abs(
    losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
  );

  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let tempWinStreak = 0;
  let tempLoseStreak = 0;

  const sortedTrades = [...closedTrades].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  sortedTrades.forEach((trade) => {
    if ((trade.pnl ?? 0) > 0) {
      tempWinStreak++;
      tempLoseStreak = 0;
      bestStreak = Math.max(bestStreak, tempWinStreak);
    } else {
      tempLoseStreak++;
      tempWinStreak = 0;
      worstStreak = Math.max(worstStreak, tempLoseStreak);
    }
  });

  const lastTrade = sortedTrades[sortedTrades.length - 1];
  if (lastTrade && (lastTrade.pnl ?? 0) > 0) {
    currentStreak = tempWinStreak;
  } else {
    currentStreak = -tempLoseStreak;
  }

  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnl = 0;
  sortedTrades.forEach((trade) => {
    runningPnl += trade.pnl ?? 0;
    peak = Math.max(peak, runningPnl);
    const drawdown = peak - runningPnl;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  // Average hold time
  const holdTimes = closedTrades
    .filter((t) => t.entryTime && t.exitTime)
    .map((t) => {
      const entry = new Date(t.entryTime).getTime();
      const exit = new Date(t.exitTime!).getTime();
      return exit - entry;
    });
  const avgHoldMs =
    holdTimes.length > 0
      ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length
      : 0;
  const avgHoldMins = Math.round(avgHoldMs / 60000);
  const avgHoldTime =
    avgHoldMins >= 60
      ? `${Math.floor(avgHoldMins / 60)}h ${avgHoldMins % 60}m`
      : `${avgHoldMins}m`;

  // Sharpe Ratio (simplified, daily)
  const dailyReturns = dailyStats.map((d) => d.totalPnl);
  const avgReturn =
    dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
    (dailyReturns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades: closedTrades.length,
    totalPnl,
    winRate: (winners.length / closedTrades.length) * 100,
    averageWin: winners.length > 0 ? grossWins / winners.length : 0,
    averageLoss: losers.length > 0 ? grossLosses / losers.length : 0,
    largestWin:
      winners.length > 0 ? Math.max(...winners.map((t) => t.pnl ?? 0)) : 0,
    largestLoss:
      losers.length > 0 ? Math.min(...losers.map((t) => t.pnl ?? 0)) : 0,
    profitFactor:
      grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
    averageRR:
      closedTrades.reduce((sum, t) => sum + (t.riskReward ?? 0), 0) /
      closedTrades.length,
    currentStreak,
    bestStreak,
    worstStreak,
    averageHoldTime: avgHoldTime,
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    maxDrawdown,
    maxDrawdownPercent: peak > 0 ? (maxDrawdown / peak) * 100 : 0,
    dailyStats,
  };
}

export function calculatePnl(trade: Partial<Trade>): number | null {
  if (!trade.entryPrice || !trade.exitPrice || !trade.quantity) return null;
  const direction = trade.direction === "long" ? 1 : -1;
  const gross =
    (trade.exitPrice - trade.entryPrice) * trade.quantity * direction;
  return gross - (trade.fees ?? 0);
}

export function calculateRiskReward(trade: Partial<Trade>): number | null {
  if (!trade.entryPrice || !trade.exitPrice || !trade.stopLoss) return null;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.exitPrice - trade.entryPrice);
  return risk > 0 ? Number((reward / risk).toFixed(2)) : null;
}
