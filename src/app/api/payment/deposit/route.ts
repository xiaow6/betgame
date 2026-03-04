import { NextRequest, NextResponse } from 'next/server';

// Mock Payment API - Deposit
// In production, this would integrate with a South African payment gateway
// (e.g., PayFast, Ozow, Peach Payments)

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, amount, method } = body;

  if (!user_id || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Mock: always succeed
  const transaction = {
    id: `tx-dep-${Date.now()}`,
    user_id,
    type: 'deposit',
    amount,
    method: method || 'mock_eft',
    status: 'completed',
    reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
    created_at: new Date().toISOString(),
    message: 'Deposit successful (mock)',
  };

  return NextResponse.json({ success: true, data: transaction });
}
