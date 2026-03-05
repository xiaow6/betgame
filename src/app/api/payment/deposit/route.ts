import { NextRequest, NextResponse } from 'next/server';
import {
  validateAmount,
  validateUserId,
  checkIdempotency,
  setIdempotency,
  getClientIp,
  logAudit,
} from '@/lib/security';

// Deposit limits (cents)
const MIN_DEPOSIT = 500;       // R5
const MAX_DEPOSIT = 1_000_000; // R10,000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Parse body safely
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, amount, method, idempotency_key } = body;

  // ─── Validate user_id ───
  if (!validateUserId(user_id)) {
    logAudit({ action: 'deposit_rejected', ip, details: { reason: 'invalid_user_id', user_id }, risk_level: 'medium' });
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  // ─── Validate amount ───
  const amountCheck = validateAmount(amount, MIN_DEPOSIT, MAX_DEPOSIT);
  if (!amountCheck.valid) {
    logAudit({ action: 'deposit_rejected', user_id: String(user_id), ip, details: { reason: amountCheck.error, amount }, risk_level: 'medium' });
    return NextResponse.json({ error: amountCheck.error }, { status: 400 });
  }

  // ─── Idempotency check (prevent duplicate deposits) ───
  if (typeof idempotency_key === 'string' && idempotency_key.length > 0) {
    const existing = checkIdempotency(`deposit:${idempotency_key}`);
    if (existing) {
      logAudit({ action: 'deposit_duplicate', user_id: String(user_id), ip, details: { idempotency_key }, risk_level: 'low' });
      return NextResponse.json(existing);
    }
  }

  // ─── Validate payment method ───
  const allowedMethods = ['eft', 'card', 'airtime'];
  const payMethod = typeof method === 'string' && allowedMethods.includes(method) ? method : 'eft';

  // ─── Generate secure transaction ID ───
  const txIdBytes = new Uint8Array(8);
  crypto.getRandomValues(txIdBytes);
  const txId = `tx-dep-${Array.from(txIdBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;

  const refBytes = new Uint8Array(6);
  crypto.getRandomValues(refBytes);
  const reference = `DEP-${Array.from(refBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

  // Credit user balance in database
  const { depositToUser } = await import('@/lib/db');
  const tx = await depositToUser(String(user_id), amountCheck.value, payMethod);

  if (!tx) {
    return NextResponse.json({ error: 'Deposit failed - user not found' }, { status: 400 });
  }

  const transaction = {
    id: tx.id || txId,
    user_id: String(user_id),
    type: 'deposit',
    amount: amountCheck.value,
    method: payMethod,
    status: 'completed',
    reference,
    balance_after: tx.balance_after,
    created_at: tx.created_at,
    message: 'Deposit successful',
  };

  const result = { success: true, data: transaction };

  // Store idempotency result
  if (typeof idempotency_key === 'string' && idempotency_key.length > 0) {
    setIdempotency(`deposit:${idempotency_key}`, result);
  }

  logAudit({
    action: 'deposit_success',
    user_id: String(user_id),
    ip,
    details: { amount: amountCheck.value, method: payMethod, tx_id: txId },
    risk_level: 'low',
  });

  return NextResponse.json(result);
}
