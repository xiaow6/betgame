import { NextRequest, NextResponse } from 'next/server';
import { getOzowConfig, verifyNotificationHash, isSuccessStatus, isFinalStatus } from '@/lib/ozow';
import { getClientIp, logAudit } from '@/lib/security';
import { getServiceClient } from '@/lib/supabase';

// POST /api/payment/ozow/notify
// Webhook called by Ozow when payment status changes
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    // Ozow may send as form data
    try {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  }

  const {
    SiteCode,
    TransactionId,
    TransactionReference,
    Amount,
    Status,
    StatusMessage,
    CurrencyCode,
    IsTest,
    Optional1,
    Optional2,
    Optional3,
    Optional4,
    Optional5,
    Hash,
  } = body;

  // Basic validation
  if (!SiteCode || !TransactionId || !TransactionReference || !Status || !Hash) {
    logAudit({
      action: 'ozow_notify_invalid',
      ip,
      details: { reason: 'missing_fields', body },
      risk_level: 'high',
    });
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify hash
  let config;
  try {
    config = getOzowConfig();
  } catch {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 });
  }

  if (SiteCode !== config.siteCode) {
    logAudit({
      action: 'ozow_notify_invalid_site',
      ip,
      details: { received: SiteCode, expected: config.siteCode },
      risk_level: 'critical',
    });
    return NextResponse.json({ error: 'Invalid site code' }, { status: 403 });
  }

  const hashValid = verifyNotificationHash({
    siteCode: SiteCode,
    transactionId: TransactionId,
    transactionReference: TransactionReference,
    amount: Amount,
    status: Status,
    optional1: Optional1,
    optional2: Optional2,
    optional3: Optional3,
    optional4: Optional4,
    optional5: Optional5,
    currencyCode: CurrencyCode || 'ZAR',
    isTest: IsTest || 'false',
    statusMessage: StatusMessage || '',
    privateKey: config.privateKey,
    receivedHash: Hash,
  });

  if (!hashValid) {
    logAudit({
      action: 'ozow_notify_hash_mismatch',
      ip,
      details: { transactionReference: TransactionReference, status: Status },
      risk_level: 'critical',
    });
    return NextResponse.json({ error: 'Hash verification failed' }, { status: 403 });
  }

  // Skip non-final statuses (Pending will be resent)
  if (!isFinalStatus(Status)) {
    logAudit({
      action: 'ozow_notify_pending',
      ip,
      details: { transactionReference: TransactionReference, status: Status },
      risk_level: 'low',
    });
    return NextResponse.json({ success: true, message: 'Pending status acknowledged' });
  }

  const db = getServiceClient();

  // Find the pending transaction by reference
  const { data: pendingTx } = await db
    .from('transactions')
    .select('*')
    .eq('reference_id', TransactionReference)
    .eq('type', 'deposit')
    .single();

  if (!pendingTx) {
    logAudit({
      action: 'ozow_notify_no_tx',
      ip,
      details: { transactionReference: TransactionReference },
      risk_level: 'high',
    });
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  // Check if already processed (idempotency)
  if (pendingTx.amount !== 0) {
    logAudit({
      action: 'ozow_notify_duplicate',
      ip,
      details: { transactionReference: TransactionReference },
      risk_level: 'low',
    });
    return NextResponse.json({ success: true, message: 'Already processed' });
  }

  if (isSuccessStatus(Status)) {
    // Payment successful - credit user
    const amountCents = Math.round(parseFloat(Amount) * 100);

    // Get current balance
    const { data: user } = await db
      .from('users')
      .select('balance')
      .eq('id', pendingTx.user_id)
      .single();

    if (!user) {
      logAudit({
        action: 'ozow_notify_user_not_found',
        ip,
        details: { user_id: pendingTx.user_id, transactionReference: TransactionReference },
        risk_level: 'critical',
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.balance + amountCents;

    // Update user balance
    await db
      .from('users')
      .update({ balance: newBalance })
      .eq('id', pendingTx.user_id);

    // Update transaction record
    await db
      .from('transactions')
      .update({
        amount: amountCents,
        balance_after: newBalance,
        description: `Ozow EFT deposit - R${Amount}`,
      })
      .eq('id', pendingTx.id);

    logAudit({
      action: 'ozow_deposit_credited',
      user_id: pendingTx.user_id,
      ip,
      details: {
        transactionReference: TransactionReference,
        ozowTransactionId: TransactionId,
        amount: amountCents,
        newBalance,
      },
      risk_level: 'low',
    });
  } else {
    // Payment failed/cancelled - update transaction description
    await db
      .from('transactions')
      .update({
        description: `Ozow deposit ${Status.toLowerCase()} - ${StatusMessage || TransactionReference}`,
      })
      .eq('id', pendingTx.id);

    logAudit({
      action: 'ozow_deposit_failed',
      user_id: pendingTx.user_id,
      ip,
      details: {
        transactionReference: TransactionReference,
        status: Status,
        statusMessage: StatusMessage,
      },
      risk_level: 'medium',
    });
  }

  return NextResponse.json({ success: true });
}
