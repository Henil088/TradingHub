import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  quantity: number;
  entryDate: string;
  targetPrice?: number;
  stopLoss?: number;
  status: "OPEN" | "CLOSED";
  exitPrice?: number;
  exitDate?: string;
  notes?: string;
}

export interface Alert {
  id: string;
  symbol: string;
  name: string;
  type: "PRICE_UP" | "PRICE_DOWN" | "EXIT_SIGNAL";
  triggerPrice: number;
  message: string;
  createdAt: string;
  triggered: boolean;
  read: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  timestamp: string;
  read: boolean;
  symbol?: string;
}

interface TradingStore {
  trades: Trade[];
  alerts: Alert[];
  notifications: Notification[];
  watchlist: string[];
  addTrade: (trade: Trade) => void;
  closeTrade: (id: string, exitPrice: number) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  checkAlerts: (symbol: string, price: number) => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      trades: [],
      alerts: [],
      notifications: [],
      watchlist: ["AAPL", "TSLA", "NVDA", "BTC-USD", "ETH-USD"],

      addTrade: (trade) =>
        set((s) => ({ trades: [trade, ...s.trades] })),

      closeTrade: (id, exitPrice) =>
        set((s) => ({
          trades: s.trades.map((t) =>
            t.id === id
              ? { ...t, status: "CLOSED", exitPrice, exitDate: new Date().toISOString() }
              : t
          ),
        })),

      addAlert: (alert) =>
        set((s) => ({ alerts: [alert, ...s.alerts] })),

      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      addNotification: (notif) =>
        set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 50) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      addToWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol)
            ? s.watchlist
            : [...s.watchlist, symbol],
        })),

      removeFromWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.filter((s2) => s2 !== symbol),
        })),

      checkAlerts: (symbol, price) => {
        const { alerts, addNotification } = get();
        const relevantAlerts = alerts.filter(
          (a) => a.symbol === symbol && !a.triggered
        );
        relevantAlerts.forEach((alert) => {
          let triggered = false;
          if (alert.type === "PRICE_UP" && price >= alert.triggerPrice) triggered = true;
          if (alert.type === "PRICE_DOWN" && price <= alert.triggerPrice) triggered = true;

          if (triggered) {
            set((s) => ({
              alerts: s.alerts.map((a) =>
                a.id === alert.id ? { ...a, triggered: true } : a
              ),
            }));
            addNotification({
              id: Date.now().toString(),
              title: `Alert: ${symbol}`,
              message: alert.message,
              type: alert.type === "PRICE_UP" ? "success" : "warning",
              timestamp: new Date().toISOString(),
              read: false,
              symbol,
            });
            // Browser notification
            if (typeof window !== "undefined" && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification(`TradingHub: ${symbol}`, {
                  body: alert.message,
                  icon: "/favicon.ico",
                });
              }
            }
          }
        });
      },
    }),
    {
      name: "tradinghub-storage",
      partialize: (s) => ({
        trades: s.trades,
        alerts: s.alerts,
        notifications: s.notifications,
        watchlist: s.watchlist,
      }),
    }
  )
);
