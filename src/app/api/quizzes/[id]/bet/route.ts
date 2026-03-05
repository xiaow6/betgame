import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getUserQuizBet } from '@/lib/db';
import { validateUserId } from '@/lib/security';

// POST /api/quizzes/:id/bet - Place a quiz bet (atomic via DB function)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quizId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user_id, option_id, amount, fund_source } = body;

  if (!validateUserId(user_id)) {
    return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 });
  }
  if (!option_id || typeof option_id !== 'string') {
    return NextResponse.json({ error: 'Invalid option_id' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const db = getServiceClient();

  // Call atomic database function
  const { data, error } = await db.rpc('place_quiz_bet', {
    p_user_id: String(user_id),
    p_quiz_id: quizId,
    p_option_id: String(option_id),
    p_amount: amount,
    p_fund_source: String(fund_source || 'balance'),
  });

  if (error) {
    const msg = error.message || 'Failed to place bet';
    const status = msg.includes('Insufficient') ? 402 :
                   msg.includes('Already placed') ? 409 :
                   msg.includes('not active') ? 410 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  // Fetch the created bet
  const bet = await getUserQuizBet(String(user_id), quizId);

  return NextResponse.json({ success: true, data: { bet_id: data, bet } });
}
