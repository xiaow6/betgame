import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getClientIp, logAudit } from '@/lib/security';
import { getServiceClient } from '@/lib/supabase';
import Stripe from 'stripe';

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = 'force-dynamic';

// POST /api/payment/stripe/webhook
// Handles Stripe webhook events (checkout.session.completed, etc.)
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const signature = request.headers.get('stripe-signature');

  // Read raw body for signature verification
  const rawBody = await request.text();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && signature) {
    // Verify webhook signature if secret is configured
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      logAudit({
        action: 'stripe_webhook_signature_failed',
        ip,
        details: { error: String(err) },
        risk_level: 'critical',
      });
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }
  } else {
    // No webhook secret configured — parse event directly
    // WARNING: In production, always set STRIPE_WEBHOOK_SECRET
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process paid sessions
    if (session.payment_status !== 'paid') {
      logAudit({
        action: 'stripe_webhook_unpaid_session',
        ip,
        details: { sessionId: session.id, paymentStatus: session.payment_status },
        risk_level: 'medium',
      });
      return NextResponse.json({ success: true, message: 'Session not paid' });
    }

    const userId = session.metadata?.user_id;
    const txRef = session.metadata?.tx_ref;
    const amountCents = parseInt(session.metadata?.amount_cents || '0', 10);

    if (!userId || !txRef || !amountCents) {
      logAudit({
        action: 'stripe_webhook_missing_metadata',
        ip,
        details: { sessionId: session.id, metadata: session.metadata },
        risk_level: 'high',
      });
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const db = getServiceClient();

    // Find the pending transaction by reference
    const { data: pendingTx } = await db
      .from('transactions')
      .select('*')
      .eq('reference_id', txRef)
      .eq('type', 'deposit')
      .single();

    if (!pendingTx) {
      logAudit({
        action: 'stripe_webhook_no_tx',
        ip,
        details: { txRef, sessionId: session.id },
        risk_level: 'high',
      });
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Idempotency — already processed
    if (pendingTx.amount !== 0) {
      logAudit({
        action: 'stripe_webhook_duplicate',
        ip,
        details: { txRef },
        risk_level: 'low',
      });
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Credit user balance (read + update — same pattern as Ozow for now)
    const { data: user } = await db
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (!user) {
      logAudit({
        action: 'stripe_webhook_user_not_found',
        ip,
        details: { userId, txRef },
        risk_level: 'critical',
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.balance + amountCents;

    // Update user balance
    await db
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    // Update transaction record
    const amountRands = (amountCents / 100).toFixed(2);
    await db
      .from('transactions')
      .update({
        amount: amountCents,
        balance_after: newBalance,
        description: `Stripe deposit - R${amountRands}`,
      })
      .eq('id', pendingTx.id);

    logAudit({
      action: 'stripe_deposit_credited',
      user_id: userId,
      ip,
      details: {
        txRef,
        stripeSessionId: session.id,
        amount: amountCents,
        newBalance,
      },
      risk_level: 'low',
    });
  }

  // Acknowledge all events (Stripe retries on non-2xx)
  return NextResponse.json({ success: true });
}
