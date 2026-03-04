// ============================================
// BetGame - Core Type Definitions
// ============================================

// --- User ---
export interface User {
  id: string;
  phone: string;
  display_name: string;
  avatar_url?: string;
  balance: number;         // Real money balance (cents)
  free_bet_balance: number; // Free bet balance (cents)
  referral_code: string;
  referred_by?: string;
  status: 'active' | 'frozen' | 'banned';
  created_at: string;
  updated_at: string;
}

// --- Sports Event ---
export type EventStatus = 'upcoming' | 'live' | 'settled' | 'cancelled';
export type EventCategory = 'soccer' | 'cricket' | 'rugby' | 'basketball' | 'tennis' | 'other';

export interface SportEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  home_team: string;
  away_team: string;
  start_time: string;
  status: EventStatus;
  options: BetOption[];
  min_bet: number;         // cents
  max_bet: number;         // cents
  min_players: number;     // Minimum bettors to proceed
  rake_percent: number;    // Platform take rate (e.g., 10)
  total_pool: number;      // Total amount bet (cents)
  settled_option_id?: string;
  created_at: string;
}

export interface BetOption {
  id: string;
  event_id: string;
  label: string;           // e.g., "Man Utd Win", "Draw", "Liverpool Win"
  odds: number;            // Display odds (decimal, e.g., 2.5)
  total_amount: number;    // Total bet on this option (cents)
  bet_count: number;       // Number of bets
}

// --- Quiz ---
export type QuizStatus = 'active' | 'settled' | 'cancelled';

export interface Quiz {
  id: string;
  question: string;
  category: string;
  options: QuizOption[];
  correct_option_id?: string; // Null until settled
  status: QuizStatus;
  min_bet: number;
  max_bet: number;
  min_players: number;
  rake_percent: number;
  total_pool: number;
  expires_at: string;
  settled_at?: string;
  created_at: string;
}

export interface QuizOption {
  id: string;
  quiz_id: string;
  label: string;
  total_amount: number;
  bet_count: number;
}

// --- Bet ---
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded' | 'cancelled';
export type BetType = 'sport' | 'quiz';
export type FundSource = 'balance' | 'free_bet';

export interface Bet {
  id: string;
  user_id: string;
  bet_type: BetType;
  event_id?: string;
  quiz_id?: string;
  option_id: string;
  amount: number;          // cents
  fund_source: FundSource;
  potential_win: number;   // cents
  actual_win?: number;     // cents (after settlement)
  status: BetStatus;
  created_at: string;
  settled_at?: string;
}

// --- Wallet Transaction ---
export type TxType =
  | 'deposit'
  | 'withdrawal'
  | 'bet_placed'
  | 'bet_won'
  | 'bet_refund'
  | 'referral_bonus'
  | 'signup_bonus'
  | 'admin_adjust';

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;          // cents, positive = credit, negative = debit
  balance_after: number;   // cents
  fund_type: 'balance' | 'free_bet';
  reference_id?: string;   // Related bet/event/quiz ID
  description: string;
  created_at: string;
}

// --- Referral ---
export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referrer_bonus: number;  // cents
  referee_bonus: number;   // cents
  status: 'pending' | 'completed';
  created_at: string;
}

// --- Admin: Event Reconciliation ---
export interface EventReconciliation {
  event_id: string;
  event_title: string;
  total_bets: number;
  total_pool: number;
  platform_rake: number;
  prize_pool: number;
  total_payout: number;
  platform_profit: number;
  variance: number;        // Should be 0
  options_breakdown: {
    option_id: string;
    label: string;
    bet_count: number;
    total_amount: number;
    is_winner: boolean;
  }[];
  anomalies: string[];
}

// --- Admin: Risk Control Config ---
export interface RiskConfig {
  default_rake_percent: number;
  default_min_players: number;
  default_min_bet: number;
  default_max_bet: number;
  max_payout_per_event: number;
  signup_bonus: number;
  referral_bonus: number;
  dynamic_odds_enabled: boolean;
  force_result_enabled: boolean; // Reserved, not activated
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
