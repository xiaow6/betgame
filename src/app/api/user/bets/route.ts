import { NextRequest, NextResponse } from 'next/server';
import { getUserBets } from '@/lib/db';

// GET /api/user/bets?user_id=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const bets = await getUserBets(userId);
  return NextResponse.json({ success: true, data: bets });
}
