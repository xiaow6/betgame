import { NextRequest, NextResponse } from 'next/server';
import { getQuizById, settleQuizInDb } from '@/lib/db';
import { getServiceClient } from '@/lib/supabase';
import { cryptoShuffle } from '@/lib/security';

// POST /api/quizzes/:id/settle - Settle a quiz (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminToken = request.cookies.get('admin_token')?.value;
  if (!adminToken && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { correct_option_id } = body;
  if (!correct_option_id || typeof correct_option_id !== 'string') {
    return NextResponse.json({ error: 'correct_option_id required' }, { status: 400 });
  }

  const quiz = await getQuizById(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }
  if (quiz.status !== 'active' && quiz.status !== 'drawing') {
    return NextResponse.json({ error: 'Quiz already settled' }, { status: 400 });
  }

  const db = getServiceClient();

  // Get all correct bets
  const { data: correctBets, error: betsErr } = await db
    .from('bets')
    .select('user_id, id')
    .eq('quiz_id', quizId)
    .eq('option_id', correct_option_id)
    .eq('status', 'pending');

  if (betsErr) {
    return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
  }

  const correctBetUsers = correctBets || [];
  const winnerCount = Math.min(quiz.winner_count, correctBetUsers.length);
  const prizePerWinner = winnerCount > 0 ? Math.floor(quiz.prize_pool / winnerCount) : 0;

  // Crypto-random shuffle for fair selection
  const shuffled = cryptoShuffle([...correctBetUsers]);
  const selectedWinners = shuffled.slice(0, winnerCount);

  // Get display names
  const winnerDetails: { user_id: string; display_name: string; prize_amount: number }[] = [];
  for (const w of selectedWinners) {
    const { data: user } = await db
      .from('users')
      .select('display_name')
      .eq('id', w.user_id)
      .single();
    winnerDetails.push({
      user_id: w.user_id,
      display_name: user?.display_name || 'Unknown',
      prize_amount: prizePerWinner,
    });
  }

  // Execute settlement
  const success = await settleQuizInDb(quizId, correct_option_id, winnerDetails);

  if (!success) {
    return NextResponse.json({ error: 'Settlement failed' }, { status: 500 });
  }

  const settled = await getQuizById(quizId);

  return NextResponse.json({
    success: true,
    data: {
      quiz: settled,
      correct_count: correctBetUsers.length,
      winner_count: winnerCount,
      prize_per_winner: prizePerWinner,
      winners: winnerDetails,
    },
  });
}
