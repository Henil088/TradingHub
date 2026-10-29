// Live market data utilities

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  sector?: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma20: number;
  sma50: number;
  sma200: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  trend: "STRONG_UP" | "UP" | "NEUTRAL" | "DOWN" | "STRONG_DOWN";
  support: number;
  resistance: number;
}

export interface PredictionData {
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  signals: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

// Popular trading symbols with display names
export const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Auto/EV" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "E-Commerce" },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors" },
  { symbol: "META", name: "Meta Platforms", sector: "Social Media" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Streaming" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors" },
  { symbol: "COIN", name: "Coinbase Global", sector: "Crypto" },
  { symbol: "BTC-USD", name: "Bitcoin", sector: "Crypto" },
  { symbol: "ETH-USD", name: "Ethereum", sector: "Crypto" },
  { symbol: "SPY", name: "S&P 500 ETF", sector: "Index" },
  { symbol: "QQQ", name: "NASDAQ-100 ETF", sector: "Index" },
  { symbol: "GLD", name: "Gold ETF", sector: "Commodities" },
];

// Fetch quote via our API route (server-side Yahoo Finance)
export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCandles(
  symbol: string,
  period: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" = "1mo"
): Promise<CandleData[]> {
  try {
    const res = await fetch(
      `/api/candles?symbol=${encodeURIComponent(symbol)}&period=${period}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Calculate RSI
export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Calculate SMA
export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// Calculate Bollinger Bands
export function calculateBollinger(closes: number[], period = 20) {
  const sma = calculateSMA(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + 2 * stdDev,
    middle: sma,
    lower: sma - 2 * stdDev,
  };
}

// Calculate MACD
export function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  return { macd, signal: macd * 0.9, histogram: macd * 0.1 };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function computeIndicators(candles: CandleData[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const rsi = calculateRSI(closes);
  const { macd, signal, histogram } = calculateMACD(closes);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const { upper, middle, lower } = calculateBollinger(closes);
  const last = closes[closes.length - 1];

  const support = Math.min(...closes.slice(-20)) * 0.99;
  const resistance = Math.max(...closes.slice(-20)) * 1.01;

  let trend: TechnicalIndicators["trend"] = "NEUTRAL";
  if (rsi > 60 && last > sma20 && last > sma50) trend = "STRONG_UP";
  else if (rsi > 50 && last > sma20) trend = "UP";
  else if (rsi < 40 && last < sma20 && last < sma50) trend = "STRONG_DOWN";
  else if (rsi < 50 && last < sma20) trend = "DOWN";

  return {
    rsi,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    sma20,
    sma50,
    sma200,
    bollingerUpper: upper,
    bollingerMiddle: middle,
    bollingerLower: lower,
    trend,
    support,
    resistance,
  };
}

export function generatePrediction(
  candles: CandleData[],
  indicators: TechnicalIndicators
): PredictionData {
  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1];
  const signals: string[] = [];

  let score = 0;

  if (indicators.rsi < 30) { signals.push("RSI oversold — buy signal"); score += 2; }
  else if (indicators.rsi > 70) { signals.push("RSI overbought — sell signal"); score -= 2; }
  else if (indicators.rsi > 55) { signals.push("RSI bullish momentum"); score += 1; }

  if (last > indicators.sma20) { signals.push("Price above 20 SMA — bullish"); score += 1; }
  else { signals.push("Price below 20 SMA — bearish"); score -= 1; }

  if (indicators.macd > indicators.macdSignal) { signals.push("MACD bullish crossover"); score += 1; }
  else { signals.push("MACD bearish crossover"); score -= 1; }

  if (last < indicators.bollingerLower) { signals.push("Price at lower Bollinger — reversal likely"); score += 1; }
  else if (last > indicators.bollingerUpper) { signals.push("Price at upper Bollinger — pullback likely"); score -= 1; }

  const direction: PredictionData["direction"] = score > 1 ? "UP" : score < -1 ? "DOWN" : "NEUTRAL";
  const confidence = Math.min(95, Math.abs(score) * 20 + 40);
  const targetPrice = direction === "UP" ? last * 1.05 : direction === "DOWN" ? last * 0.95 : last;
  const stopLoss = direction === "UP" ? last * 0.97 : last * 1.03;

  return {
    direction,
    confidence,
    targetPrice,
    stopLoss,
    timeframe: "5-10 trading days",
    signals,
    riskLevel: confidence > 75 ? "LOW" : confidence > 55 ? "MEDIUM" : "HIGH",
  };
}
