import { NextRequest, NextResponse } from 'next/server';
import {
  validateAmount,
  validateUserId,
  sanitizeString,
  checkIdempotency,
  setIdempotency,
  getClientIp,
  logAudit,
} from '@/lib/security';

// Withdrawal limits (cents)
const MIN_WITHDRAWAL = 5_000;     // R50
const MAX_WITHDRAWAL = 500_000;   // R5,000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Parse body safely
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, amount, bank_account, idempotency_key } = body;

  // ─── Validate user_id ───
  if (!validateUserId(user_id)) {
    logAudit({ action: 'withdraw_rejected', ip, details: { reason: 'invalid_user_id', user_id }, risk_level: 'high' });
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  // ─── Validate amount ───
  const amountCheck = validateAmount(amount, MIN_WITHDRAWAL, MAX_WITHDRAWAL);
  if (!amountCheck.valid) {
    logAudit({ action: 'withdraw_rejected', user_id: String(user_id), ip, details: { reason: amountCheck.error, amount }, risk_level: 'medium' });
    return NextResponse.json({ error: amountCheck.error }, { status: 400 });
  }

  // ─── Idempotency check ───
  if (typeof idempotency_key === 'string' && idempotency_key.length > 0) {
    const existing = checkIdempotency(`withdraw:${idempotency_key}`);
    if (existing) {
      logAudit({ action: 'withdraw_duplicate', user_id: String(user_id), ip, details: { idempotency_key }, risk_level: 'medium' });
      return NextResponse.json(existing);
    }
  }

  // In production:
  // 1. Verify user balance >= withdrawal amount (database check)
  // 2. Check KYC status
  // 3. Lock balance (pessimistic lock) to prevent double-spend
  // 4. Initiate payout via payment gateway
  // 5. Deduct balance only after gateway confirmation
  // 6. Check velocity (max N withdrawals per day/week)
  // 7. Flag large withdrawals for manual review

  const bankDisplay = sanitizeString(bank_account, 20) || '****1234';

  const txIdBytes = new Uint8Array(8);
  crypto.getRandomValues(txIdBytes);
  const txId = `tx-wd-${Array.from(txIdBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;

  const refBytes = new Uint8Array(6);
  crypto.getRandomValues(refBytes);
  const reference = `WD-${Array.from(refBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

  const transaction = {
    id: txId,
    user_id: String(user_id),
    type: 'withdrawal',
    amount: -amountCheck.value,
    method: 'eft',
    bank_account: bankDisplay,
    status: 'processing',
    estimated_arrival: '1-3 business days',
    reference,
    created_at: new Date().toISOString(),
    message: 'Withdrawal initiated (mock)',
  };

  const result = { success: true, data: transaction };

  if (typeof idempotency_key === 'string' && idempotency_key.length > 0) {
    setIdempotency(`withdraw:${idempotency_key}`, result);
  }

  logAudit({
    action: 'withdraw_initiated',
    user_id: String(user_id),
    ip,
    details: { amount: amountCheck.value, tx_id: txId },
    risk_level: 'high',
  });

  return NextResponse.json(result);
}
