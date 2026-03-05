import { create } from 'zustand';
import { User, SportEvent, Quiz, Bet, Transaction } from '@/types';
import { mockEvents } from '@/lib/mock-data';

interface AppState {
  // Auth
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
  loadUser: () => Promise<void>;

  // Events
  events: SportEvent[];
  setEvents: (events: SportEvent[]) => void;

  // Quizzes
  quizzes: Quiz[];
  setQuizzes: (quizzes: Quiz[]) => void;

  // Bets
  bets: Bet[];
  addBet: (bet: Bet) => void;

  // Transactions
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;

  // Wallet
  updateBalance: (amount: number, fundType: 'balance' | 'free_bet') => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth - start with null, load from API
  user: null,
  isLoggedIn: false,
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
  loadUser: async () => {
    try {
      // Try to load test user by phone
      const res = await fetch('/api/user?phone=%2B27812345678');
      const data = await res.json();
      if (data.success && data.data) {
        set({ user: data.data, isLoggedIn: true });
      }
    } catch {
      // If API fails, stay logged out
    }
  },

  // Events (still mock for now)
  events: mockEvents,
  setEvents: (events) => set({ events }),

  // Quizzes
  quizzes: [],
  setQuizzes: (quizzes) => set({ quizzes }),

  // Bets
  bets: [],
  addBet: (bet) => set((state) => ({ bets: [bet, ...state.bets] })),

  // Transactions
  transactions: [],
  addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),

  // Wallet
  updateBalance: (amount, fundType) => set((state) => {
    if (!state.user) return state;
    if (fundType === 'balance') {
      return { user: { ...state.user, balance: state.user.balance + amount } };
    }
    return { user: { ...state.user, free_bet_balance: state.user.free_bet_balance + amount } };
  }),

  // UI
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
