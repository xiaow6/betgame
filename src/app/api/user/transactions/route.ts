import { NextRequest, NextResponse } from 'next/server';
import { getUserTransactions } from '@/lib/db';

// GET /api/user/transactions?user_id=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const txs = await getUserTransactions(userId);
  return NextResponse.json({ success: true, data: txs });
}
