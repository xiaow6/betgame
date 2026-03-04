// ============================================
// Settlement Engine - Core business logic
// Handles event/quiz settlement, payout calculation,
// reconciliation, and audit trail
// ============================================

import { v4 as uuidv4 } from 'uuid';

export interface SettlementEvent {
  id: string;
  title: string;
  type: 'sport' | 'quiz';
  options: SettlementOption[];
  rake_percent: number;
  min_players: number;
  total_pool: number;
  status: 'pending' | 'settled' | 'cancelled';
}

export interface SettlementOption {
  id: string;
  label: string;
  total_amount: number;
  bet_count: number;
}

export interface SettlementBet {
  id: string;
  user_id: string;
  option_id: string;
  amount: number;
  fund_source: 'balance' | 'free_bet';
  status: 'pending' | 'won' | 'lost' | 'refunded';
  actual_win: number;
}

export interface SettlementUser {
  id: string;
  display_name: string;
  balance: number;
  free_bet_balance: number;
}

export interface SettlementResult {
  event_id: string;
  event_title: string;
  winning_option_id: string;
  winning_option_label: string;
  total_pool: number;
  rake: number;
  prize_pool: number;
  total_payout: number;
  platform_profit: number;
  variance: number;
  bets_processed: number;
  winners_count: number;
  losers_count: number;
  refunds_count: number;
  options_breakdown: {
    option_id: string;
    label: string;
    bet_count: number;
    total_amount: number;
    is_winner: boolean;
  }[];
  payout_details: {
    user_id: string;
    bet_id: string;
    bet_amount: number;
    payout: number;
    fund_source: string;
  }[];
  passed: boolean;
  errors: string[];
}

// Core settlement function
export function settleEvent(
  event: SettlementEvent,
  bets: SettlementBet[],
  users: Map<string, SettlementUser>,
  winningOptionId: string
): SettlementResult {
  const errors: string[] = [];

  const winningOption = event.options.find(o => o.id === winningOptionId);
  if (!winningOption) {
    errors.push(`Winning option ${winningOptionId} not found`);
    return createErrorResult(event, errors);
  }

  // Check minimum players
  const totalBettors = bets.length;
  if (totalBettors < event.min_players) {
    // Cancel and refund
    return cancelAndRefund(event, bets, users);
  }

  // Calculate pools
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const rake = Math.floor(totalPool * event.rake_percent / 100);
  const prizePool = totalPool - rake;

  // Verify pool matches event total
  if (totalPool !== event.total_pool) {
    errors.push(`Pool mismatch: calculated ${totalPool} vs event ${event.total_pool}`);
  }

  // Identify winners and losers
  const winningBets = bets.filter(b => b.option_id === winningOptionId);
  const losingBets = bets.filter(b => b.option_id !== winningOptionId);
  const winnerTotalBet = winningBets.reduce((sum, b) => sum + b.amount, 0);

  // Calculate payouts (proportional)
  let totalPayout = 0;
  const payoutDetails: SettlementResult['payout_details'] = [];

  for (const bet of winningBets) {
    let payout: number;
    if (winnerTotalBet > 0) {
      payout = Math.floor((bet.amount / winnerTotalBet) * prizePool);
    } else {
      payout = 0;
    }

    bet.status = 'won';
    bet.actual_win = payout;
    totalPayout += payout;

    // Credit user balance (always real balance, even if bet was free)
    const user = users.get(bet.user_id);
    if (user) {
      user.balance += payout;
    }

    payoutDetails.push({
      user_id: bet.user_id,
      bet_id: bet.id,
      bet_amount: bet.amount,
      payout,
      fund_source: bet.fund_source,
    });
  }

  // Mark losers
  for (const bet of losingBets) {
    bet.status = 'lost';
    bet.actual_win = 0;
  }

  // Handle rounding dust (prize pool - total payout)
  const variance = prizePool - totalPayout;
  if (Math.abs(variance) > winningBets.length) {
    // Variance should be at most 1 cent per winner (rounding)
    errors.push(`Large variance: ${variance} cents (${winningBets.length} winners)`);
  }

  const platformProfit = totalPool - totalPayout;

  // Build options breakdown
  const optionsBreakdown = event.options.map(opt => ({
    option_id: opt.id,
    label: opt.label,
    bet_count: bets.filter(b => b.option_id === opt.id).length,
    total_amount: bets.filter(b => b.option_id === opt.id).reduce((s, b) => s + b.amount, 0),
    is_winner: opt.id === winningOptionId,
  }));

  return {
    event_id: event.id,
    event_title: event.title,
    winning_option_id: winningOptionId,
    winning_option_label: winningOption.label,
    total_pool: totalPool,
    rake,
    prize_pool: prizePool,
    total_payout: totalPayout,
    platform_profit: platformProfit,
    variance,
    bets_processed: bets.length,
    winners_count: winningBets.length,
    losers_count: losingBets.length,
    refunds_count: 0,
    options_breakdown: optionsBreakdown,
    payout_details: payoutDetails,
    passed: errors.length === 0,
    errors,
  };
}

// Cancel event and refund all bets
function cancelAndRefund(
  event: SettlementEvent,
  bets: SettlementBet[],
  users: Map<string, SettlementUser>
): SettlementResult {
  let totalRefunded = 0;

  for (const bet of bets) {
    bet.status = 'refunded';
    bet.actual_win = 0;

    const user = users.get(bet.user_id);
    if (user) {
      if (bet.fund_source === 'balance') {
        user.balance += bet.amount;
      } else {
        user.free_bet_balance += bet.amount;
      }
    }
    totalRefunded += bet.amount;
  }

  return {
    event_id: event.id,
    event_title: event.title + ' (CANCELLED - min players not met)',
    winning_option_id: '',
    winning_option_label: 'N/A - Cancelled',
    total_pool: event.total_pool,
    rake: 0,
    prize_pool: 0,
    total_payout: 0,
    platform_profit: 0,
    variance: 0,
    bets_processed: bets.length,
    winners_count: 0,
    losers_count: 0,
    refunds_count: bets.length,
    options_breakdown: event.options.map(opt => ({
      option_id: opt.id,
      label: opt.label,
      bet_count: bets.filter(b => b.option_id === opt.id).length,
      total_amount: bets.filter(b => b.option_id === opt.id).reduce((s, b) => s + b.amount, 0),
      is_winner: false,
    })),
    payout_details: [],
    passed: totalRefunded === event.total_pool,
    errors: totalRefunded !== event.total_pool
      ? [`Refund mismatch: refunded ${totalRefunded} vs pool ${event.total_pool}`]
      : [],
  };
}

function createErrorResult(event: SettlementEvent, errors: string[]): SettlementResult {
  return {
    event_id: event.id,
    event_title: event.title,
    winning_option_id: '',
    winning_option_label: 'ERROR',
    total_pool: event.total_pool,
    rake: 0,
    prize_pool: 0,
    total_payout: 0,
    platform_profit: 0,
    variance: 0,
    bets_processed: 0,
    winners_count: 0,
    losers_count: 0,
    refunds_count: 0,
    options_breakdown: [],
    payout_details: [],
    passed: false,
    errors,
  };
}

// ==================== QUIZ LOTTERY SETTLEMENT ====================

export interface QuizSettlementInput {
  id: string;
  question: string;
  entry_fee: number;
  prize_pool: number;
  winner_count: number;
  participants: number;
  options: { id: string; label: string; pick_count: number }[];
  correct_option_id: string;
}

export interface QuizSettlementBet {
  id: string;
  user_id: string;
  display_name: string;
  option_id: string;
  amount: number;
}

export interface QuizSettlementResult {
  quiz_id: string;
  question: string;
  correct_option_id: string;
  correct_option_label: string;
  total_participants: number;
  correct_count: number;
  total_revenue: number;          // entry_fee * participants
  prize_pool: number;
  platform_profit: number;        // revenue - prize_pool
  winner_count: number;           // actual drawn winners
  prize_per_winner: number;
  winners: { user_id: string; display_name: string; prize_amount: number }[];
  passed: boolean;
  errors: string[];
}

// Settle a quiz: reveal answer → filter correct → random draw → distribute prizes
export function settleQuiz(
  quiz: QuizSettlementInput,
  bets: QuizSettlementBet[],
  users: Map<string, SettlementUser>
): QuizSettlementResult {
  const errors: string[] = [];

  const correctOption = quiz.options.find(o => o.id === quiz.correct_option_id);
  if (!correctOption) {
    errors.push(`Correct option ${quiz.correct_option_id} not found`);
    return {
      quiz_id: quiz.id,
      question: quiz.question,
      correct_option_id: quiz.correct_option_id,
      correct_option_label: 'ERROR',
      total_participants: quiz.participants,
      correct_count: 0,
      total_revenue: quiz.entry_fee * quiz.participants,
      prize_pool: quiz.prize_pool,
      platform_profit: quiz.entry_fee * quiz.participants,
      winner_count: 0,
      prize_per_winner: 0,
      winners: [],
      passed: false,
      errors,
    };
  }

  // Filter correct answers
  const correctBets = bets.filter(b => b.option_id === quiz.correct_option_id);
  const correctCount = correctBets.length;

  // Determine actual winner count (can't exceed correct answers)
  const actualWinnerCount = Math.min(quiz.winner_count, correctCount);
  const prizePerWinner = actualWinnerCount > 0
    ? Math.floor(quiz.prize_pool / actualWinnerCount)
    : 0;

  // Random draw from correct answers
  const shuffled = [...correctBets].sort(() => Math.random() - 0.5);
  const drawnWinners = shuffled.slice(0, actualWinnerCount);

  // Distribute prizes
  const winners: QuizSettlementResult['winners'] = [];
  let totalPayout = 0;

  for (const bet of drawnWinners) {
    const user = users.get(bet.user_id);
    if (user) {
      user.balance += prizePerWinner;
    }
    winners.push({
      user_id: bet.user_id,
      display_name: bet.display_name,
      prize_amount: prizePerWinner,
    });
    totalPayout += prizePerWinner;
  }

  const totalRevenue = quiz.entry_fee * bets.length;
  const platformProfit = totalRevenue - totalPayout;

  // Validation
  if (totalPayout > quiz.prize_pool) {
    errors.push(`Payout ${totalPayout} exceeds prize pool ${quiz.prize_pool}`);
  }
  if (platformProfit < 0) {
    errors.push(`Platform profit is negative: ${platformProfit}`);
  }

  return {
    quiz_id: quiz.id,
    question: quiz.question,
    correct_option_id: quiz.correct_option_id,
    correct_option_label: correctOption.label,
    total_participants: bets.length,
    correct_count: correctCount,
    total_revenue: totalRevenue,
    prize_pool: quiz.prize_pool,
    platform_profit: platformProfit,
    winner_count: actualWinnerCount,
    prize_per_winner: prizePerWinner,
    winners,
    passed: errors.length === 0,
    errors,
  };
}

// ==================== TEST DATA GENERATOR ====================

const TEAM_NAMES = [
  'Chiefs', 'Pirates', 'Sundowns', 'Celtic', 'Arrows', 'Galaxy',
  'Wits', 'Stars', 'City', 'United', 'Swallows', 'Baroka',
];

const QUIZ_QUESTIONS = [
  'Who scored the most goals in PSL 2025?',
  'Which team won the 2024 Champions League?',
  'How many World Cups has Brazil won?',
  'Who is the all-time top scorer in Premier League?',
  'Which country hosted the 2010 FIFA World Cup?',
  'How many Ballon d\'Or has Ronaldo won?',
  'Which club has won the most La Liga titles?',
  'Who won the 2023 Rugby World Cup?',
  'What year was the first FIFA World Cup held?',
  'Which country has won the most Cricket World Cups?',
];

const USER_NAMES = [
  'Thando', 'Sipho', 'Nomsa', 'Bongani', 'Lerato', 'Kagiso',
  'Zanele', 'Mandla', 'Precious', 'Thabiso', 'Nokuthula', 'Siyabonga',
  'Mbali', 'Dumisani', 'Ayanda', 'Fezile', 'Nompumelelo', 'Jabulani',
  'Lindiwe', 'Mthunzi',
];

export function generateTestRound(roundNumber: number): {
  event: SettlementEvent;
  bets: SettlementBet[];
  users: Map<string, SettlementUser>;
  expectedWinningOptionId: string;
} {
  const isQuiz = roundNumber % 3 === 0; // Every 3rd round is a quiz
  const isCancelTest = roundNumber === 5; // Round 5 tests cancellation (low players)

  const eventId = `test-evt-${roundNumber.toString().padStart(3, '0')}`;

  // Generate options
  const optionCount = isQuiz ? 4 : 3;
  const options: SettlementOption[] = [];
  const optionLabels = isQuiz
    ? ['Option A', 'Option B', 'Option C', 'Option D']
    : [TEAM_NAMES[roundNumber % TEAM_NAMES.length], 'Draw', TEAM_NAMES[(roundNumber + 1) % TEAM_NAMES.length]];

  for (let i = 0; i < optionCount; i++) {
    options.push({
      id: `${eventId}-opt-${i}`,
      label: optionLabels[i],
      total_amount: 0,
      bet_count: 0,
    });
  }

  // Generate users
  const userCount = isCancelTest ? 5 : 15 + Math.floor(Math.random() * 20);
  const users = new Map<string, SettlementUser>();
  for (let i = 0; i < userCount; i++) {
    const userId = `test-user-${roundNumber}-${i}`;
    users.set(userId, {
      id: userId,
      display_name: USER_NAMES[i % USER_NAMES.length],
      balance: 50000, // R500 start
      free_bet_balance: i < 3 ? 500 : 0, // First 3 users have free bets
    });
  }

  // Generate bets
  const bets: SettlementBet[] = [];
  const userIds = Array.from(users.keys());

  for (const userId of userIds) {
    const user = users.get(userId)!;
    const optionIndex = Math.floor(Math.random() * optionCount);
    const option = options[optionIndex];
    const useFree = user.free_bet_balance > 0 && Math.random() > 0.5;
    const amount = useFree ? 500 : (Math.floor(Math.random() * 10) + 1) * 100; // R1-R10 or R5 free

    // Deduct from user
    if (useFree) {
      user.free_bet_balance -= amount;
    } else {
      user.balance -= amount;
    }

    option.total_amount += amount;
    option.bet_count++;

    bets.push({
      id: uuidv4(),
      user_id: userId,
      option_id: option.id,
      amount,
      fund_source: useFree ? 'free_bet' : 'balance',
      status: 'pending',
      actual_win: 0,
    });
  }

  const totalPool = options.reduce((sum, o) => sum + o.total_amount, 0);

  const event: SettlementEvent = {
    id: eventId,
    title: isQuiz
      ? QUIZ_QUESTIONS[(roundNumber - 1) % QUIZ_QUESTIONS.length]
      : `${optionLabels[0]} vs ${optionLabels[2]} (Test #${roundNumber})`,
    type: isQuiz ? 'quiz' : 'sport',
    options,
    rake_percent: 10,
    min_players: 10,
    total_pool: totalPool,
    status: 'pending',
  };

  // Pick a winner (random option that has bets)
  const optionsWithBets = options.filter(o => o.bet_count > 0);
  const winnerIdx = roundNumber % optionsWithBets.length;
  const expectedWinningOptionId = optionsWithBets[winnerIdx].id;

  return { event, bets, users, expectedWinningOptionId };
}

// Validate settlement result
export function validateSettlement(result: SettlementResult, expectedCancelled: boolean): string[] {
  const errors: string[] = [];

  if (expectedCancelled) {
    if (result.refunds_count === 0) {
      errors.push('Expected cancellation with refunds but got none');
    }
    if (result.rake !== 0) {
      errors.push(`Cancelled event should have 0 rake, got ${result.rake}`);
    }
    return errors;
  }

  // Pool consistency
  if (result.total_pool !== result.rake + result.prize_pool) {
    errors.push(`Pool breakdown: ${result.total_pool} != ${result.rake} + ${result.prize_pool}`);
  }

  // Payout should not exceed prize pool
  if (result.total_payout > result.prize_pool) {
    errors.push(`Payout ${result.total_payout} exceeds prize pool ${result.prize_pool}`);
  }

  // Platform profit should be positive
  if (result.platform_profit < 0) {
    errors.push(`Platform profit is negative: ${result.platform_profit}`);
  }

  // Variance should be small (rounding only)
  if (Math.abs(result.variance) > result.winners_count + 1) {
    errors.push(`Large variance: ${result.variance} with ${result.winners_count} winners`);
  }

  // All bets should be processed
  if (result.bets_processed !== result.winners_count + result.losers_count + result.refunds_count) {
    errors.push(`Bet count mismatch: ${result.bets_processed} != ${result.winners_count}+${result.losers_count}+${result.refunds_count}`);
  }

  // Winners must have payout > 0
  for (const pd of result.payout_details) {
    if (pd.payout <= 0) {
      errors.push(`Winner ${pd.user_id} has 0 payout`);
    }
  }

  // Options breakdown total should match pool
  const optionsTotal = result.options_breakdown.reduce((s, o) => s + o.total_amount, 0);
  if (optionsTotal !== result.total_pool) {
    errors.push(`Options total ${optionsTotal} != pool ${result.total_pool}`);
  }

  return errors;
}
