import { NextRequest, NextResponse } from 'next/server';

// Mock Payment API - Withdrawal
// In production: PayFast/Ozow payout, with KYC verification

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, amount, bank_account } = body;

  if (!user_id || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (amount < 5000) { // Min R50 withdrawal
    return NextResponse.json({ error: 'Minimum withdrawal is R50' }, { status: 400 });
  }

  // Mock: always succeed with processing delay
  const transaction = {
    id: `tx-wd-${Date.now()}`,
    user_id,
    type: 'withdrawal',
    amount: -amount,
    method: 'mock_eft',
    bank_account: bank_account || '****1234',
    status: 'processing',
    estimated_arrival: '1-3 business days',
    reference: `WD-${Date.now().toString(36).toUpperCase()}`,
    created_at: new Date().toISOString(),
    message: 'Withdrawal initiated (mock)',
  };

  return NextResponse.json({ success: true, data: transaction });
}
