import { getServiceClient } from './supabase';
import type { Quiz, QuizOption, User, Bet, Transaction } from '@/types';

const db = () => getServiceClient();

// ─── Users ───

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await db()
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const { data, error } = await db()
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function createUser(user: {
  phone: string;
  display_name: string;
  referral_code: string;
  referred_by?: string;
  balance?: number;
  free_bet_balance?: number;
}): Promise<User | null> {
  const { data, error } = await db()
    .from('users')
    .insert(user)
    .select()
    .single();
  if (error) { console.error('createUser error:', error); return null; }
  return data as User;
}

// ─── Quizzes ───

export async function getActiveQuizzes(): Promise<Quiz[]> {
  const { data, error } = await db()
    .from('quizzes')
    .select('*, quiz_options:quiz_options(*)')
    .in('status', ['active', 'drawing'])
    .order('expires_at', { ascending: true });
  if (error) { console.error('getActiveQuizzes error:', JSON.stringify(error)); return []; }
  return (data || []).map(mapQuizRow);
}

export async function getSettledQuizzes(limit = 10): Promise<Quiz[]> {
  const { data, error } = await db()
    .from('quizzes')
    .select('*, quiz_options:quiz_options(*), quiz_winners:quiz_winners(*)')
    .eq('status', 'settled')
    .order('settled_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getSettledQuizzes error:', JSON.stringify(error)); return []; }
  return (data || []).map(mapQuizRow);
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const { data, error } = await db()
    .from('quizzes')
    .select('*, quiz_options:quiz_options(*), quiz_winners:quiz_winners(*)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapQuizRow(data);
}

export async function createQuiz(quiz: {
  question: string;
  category: string;
  entry_fee: number;
  prize_pool: number;
  winner_count: number;
  expires_at: string;
  draw_at?: string;
  options: string[]; // labels
}): Promise<Quiz | null> {
  const { options, ...quizData } = quiz;

  const { data: quizRow, error: quizError } = await db()
    .from('quizzes')
    .insert(quizData)
    .select()
    .single();

  if (quizError || !quizRow) {
    console.error('createQuiz error:', JSON.stringify(quizError));
    throw new Error(`createQuiz failed: ${quizError?.message || 'no data returned'}`);
  }

  const optionRows = options.map((label) => ({
    quiz_id: quizRow.id,
    label,
    pick_count: 0,
  }));

  const { error: optError } = await db()
    .from('quiz_options')
    .insert(optionRows);

  if (optError) {
    console.error('createQuiz options error:', JSON.stringify(optError));
    throw new Error(`createQuiz options failed: ${optError.message}`);
  }

  return getQuizById(quizRow.id);
}

export async function settleQuizInDb(
  quizId: string,
  correctOptionId: string,
  winners: { user_id: string; display_name: string; prize_amount: number }[]
): Promise<boolean> {
  // 1. Update quiz status
  const { error: quizErr } = await db()
    .from('quizzes')
    .update({
      status: 'settled',
      correct_option_id: correctOptionId,
      settled_at: new Date().toISOString(),
      correct_count: 0, // will be computed below
    })
    .eq('id', quizId);

  if (quizErr) { console.error('settleQuiz error:', quizErr); return false; }

  // 2. Count correct answers
  const { count } = await db()
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('option_id', correctOptionId)
    .eq('status', 'pending');

  await db()
    .from('quizzes')
    .update({ correct_count: count || 0 })
    .eq('id', quizId);

  // 3. Mark losing bets
  await db()
    .from('bets')
    .update({ status: 'lost', settled_at: new Date().toISOString() })
    .eq('quiz_id', quizId)
    .neq('option_id', correctOptionId)
    .eq('status', 'pending');

  // 4. Insert winners and credit prizes
  if (winners.length > 0) {
    const winnerRows = winners.map((w) => ({
      quiz_id: quizId,
      user_id: w.user_id,
      display_name: w.display_name,
      prize_amount: w.prize_amount,
    }));
    await db().from('quiz_winners').insert(winnerRows);

    // Credit each winner
    for (const w of winners) {
      // Update user balance
      const { data: user } = await db()
        .from('users')
        .select('balance')
        .eq('id', w.user_id)
        .single();

      if (user) {
        const newBalance = user.balance + w.prize_amount;
        await db()
          .from('users')
          .update({ balance: newBalance })
          .eq('id', w.user_id);

        // Update bet status
        await db()
          .from('bets')
          .update({
            status: 'won',
            actual_win: w.prize_amount,
            settled_at: new Date().toISOString(),
          })
          .eq('quiz_id', quizId)
          .eq('user_id', w.user_id)
          .eq('status', 'pending');

        // Transaction record
        await db().from('transactions').insert({
          user_id: w.user_id,
          type: 'bet_won',
          amount: w.prize_amount,
          balance_after: newBalance,
          fund_type: 'balance',
          reference_id: quizId,
          description: `TV Grand Prize winner - ${w.display_name}`,
        });
      }
    }
  }

  return true;
}

// ─── Bets ───

export async function getUserBets(userId: string, limit = 20): Promise<Bet[]> {
  const { data, error } = await db()
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getUserBets error:', error); return []; }
  return (data || []) as Bet[];
}

export async function getUserQuizBet(userId: string, quizId: string): Promise<Bet | null> {
  const { data, error } = await db()
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .single();
  if (error || !data) return null;
  return data as Bet;
}

// ─── Transactions ───

export async function getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const { data, error } = await db()
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getUserTransactions error:', error); return []; }
  return (data || []) as Transaction[];
}

export async function depositToUser(userId: string, amount: number, method: string): Promise<Transaction | null> {
  const { data: user } = await db()
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  if (!user) return null;

  const newBalance = user.balance + amount;

  await db()
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId);

  const { data: tx, error } = await db()
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'deposit',
      amount,
      balance_after: newBalance,
      fund_type: 'balance',
      description: `Deposit via ${method}`,
    })
    .select()
    .single();

  if (error) { console.error('depositToUser error:', error); return null; }
  return tx as Transaction;
}

// ─── Helpers ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuizRow(row: any): Quiz {
  return {
    id: row.id,
    question: row.question,
    category: row.category || 'other',
    options: (row.quiz_options || []).map((o: QuizOption) => ({
      id: o.id,
      quiz_id: o.quiz_id,
      label: o.label,
      pick_count: o.pick_count || 0,
    })),
    correct_option_id: row.correct_option_id,
    status: row.status,
    entry_fee: row.entry_fee || 0,
    prize_pool: row.prize_pool || 0,
    winner_count: row.winner_count || 1,
    participants: row.participants || 0,
    correct_count: row.correct_count || 0,
    winners: row.quiz_winners || undefined,
    expires_at: row.expires_at,
    draw_at: row.draw_at,
    settled_at: row.settled_at,
    created_at: row.created_at,
  };
}
