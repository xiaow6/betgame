// ============================================
// BetGame - Constants & Config
// ============================================

export const APP_NAME = 'BetGame';
export const CURRENCY = 'R'; // South African Rand
export const CURRENCY_CODE = 'ZAR';

// Amounts in cents
export const SIGNUP_BONUS = 500;        // R5
export const REFERRAL_BONUS = 500;      // R5 each

// Default risk control
export const DEFAULT_RAKE_PERCENT = 10;
export const DEFAULT_MIN_PLAYERS = 10;
export const DEFAULT_MIN_BET = 100;     // R1
export const DEFAULT_MAX_BET = 50000;   // R500
export const MAX_PAYOUT_PER_EVENT = 5000000; // R50,000

// Format cents to display string
export function formatMoney(cents: number): string {
  const rand = cents / 100;
  return `${CURRENCY}${rand.toFixed(2)}`;
}

// Format short (no decimals for whole numbers)
export function formatMoneyShort(cents: number): string {
  const rand = cents / 100;
  if (rand % 1 === 0) return `${CURRENCY}${rand}`;
  return `${CURRENCY}${rand.toFixed(2)}`;
}

// Event categories with labels
export const EVENT_CATEGORIES = [
  { value: 'soccer', label: 'Soccer', icon: '⚽' },
  { value: 'cricket', label: 'Cricket', icon: '🏏' },
  { value: 'rugby', label: 'Rugby', icon: '🏉' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'other', label: 'Other', icon: '🎯' },
] as const;

// Tab navigation
export const NAV_TABS = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'betting', label: 'Bet', href: '/betting' },
  { key: 'quiz', label: 'Quiz', href: '/quiz' },
  { key: 'wallet', label: 'Wallet', href: '/wallet' },
  { key: 'profile', label: 'Me', href: '/profile' },
] as const;
