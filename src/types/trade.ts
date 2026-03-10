export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type AssetClass = 'stocks' | 'options' | 'futures' | 'forex' | 'crypto';
export type Emotion = 'confident' | 'fearful' | 'greedy' | 'neutral' | 'anxious' | 'disciplined' | 'impulsive' | 'calm';
export type TradeSetup = 'breakout' | 'pullback' | 'reversal' | 'trend_following' | 'scalp' | 'swing' | 'gap_fill' | 'momentum' | 'mean_reversion' | 'custom';

export interface Trade {
    id: string;
    date: string;
    symbol: string;
    assetClass: AssetClass;
    direction: TradeDirection;
    status: TradeStatus;
    entryPrice: number;
    exitPrice: number | null;
    quantity: number;
    stopLoss: number | null;
    takeProfit: number | null;
    fees: number;
    pnl: number | null;
    pnlPercent: number | null;
    setup: TradeSetup;
    tags: string[];
    emotionBefore: Emotion;
    emotionAfter: Emotion | null;
    confidence: number; // 1-10
    notes: string;
    screenshot: string | null;
    entryTime: string;
    exitTime: string | null;
    strategy: string;
    riskReward: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface DailyStats {
    date: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalPnl: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    profitFactor: number;
    averageRR: number;
}

export interface PortfolioStats {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    profitFactor: number;
    averageRR: number;
    currentStreak: number;
    bestStreak: number;
    worstStreak: number;
    averageHoldTime: string;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    dailyStats: DailyStats[];
}

export interface AIInsight {
    id: string;
    type: 'pattern' | 'suggestion' | 'warning' | 'coaching';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'success' | 'critical';
    createdAt: string;
    relatedTrades: string[];
}

export interface JournalEntry {
    id: string;
    date: string;
    preMarketNotes: string;
    postMarketNotes: string;
    mood: Emotion;
    lessonsLearned: string;
    goalsForTomorrow: string;
    marketConditions: string;
    overallRating: number; // 1-10
    trades: string[]; // trade IDs
    createdAt: string;
    updatedAt: string;
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    rules: string[];
    setup: TradeSetup;
    timeframe: string;
    assetClasses: AssetClass[];
    winRate: number | null;
    totalTrades: number;
    createdAt: string;
    updatedAt: string;
}
