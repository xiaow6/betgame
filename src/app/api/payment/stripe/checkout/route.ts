import { NextRequest, NextResponse } from 'next/server';
import { getStripe, centsToStripeAmount } from '@/lib/stripe';
import { validateAmount, validateUserId, getClientIp, logAudit } from '@/lib/security';
import { getServiceClient } from '@/lib/supabase';

// Deposit limits (cents)
const MIN_DEPOSIT = 500;       // R5
const MAX_DEPOSIT = 1_000_000; // R10,000

// POST /api/payment/stripe/checkout
// Creates a Stripe Checkout session and returns the URL
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, amount } = body;

  if (!validateUserId(user_id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const amountCheck = validateAmount(amount, MIN_DEPOSIT, MAX_DEPOSIT);
  if (!amountCheck.valid) {
    return NextResponse.json({ error: amountCheck.error }, { status: 400 });
  }

  // Verify user exists
  const db = getServiceClient();
  const { data: user, error: userErr } = await db
    .from('users')
    .select('id, phone, display_name')
    .eq('id', String(user_id))
    .single();

  if (userErr || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const stripe = getStripe();

    // Generate unique reference
    const txRef = `BG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amountRands = (amountCheck.value / 100).toFixed(2);

    // Build base URL from request
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    // Store pending transaction in DB
    await db.from('transactions').insert({
      user_id: String(user_id),
      type: 'deposit',
      amount: 0, // Updated on webhook confirmation
      balance_after: 0,
      fund_type: 'balance',
      reference_id: txRef,
      description: `Stripe deposit pending - ${txRef}`,
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'zar',
      line_items: [
        {
          price_data: {
            currency: 'zar',
            unit_amount: centsToStripeAmount(amountCheck.value),
            product_data: {
              name: 'Wallet Deposit',
              description: `Deposit R${amountRands} to your BetGame wallet`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: String(user_id),
        tx_ref: txRef,
        amount_cents: String(amountCheck.value),
      },
      success_url: `${baseUrl}/wallet?payment=success&ref=${txRef}`,
      cancel_url: `${baseUrl}/wallet?payment=cancelled&ref=${txRef}`,
    });

    logAudit({
      action: 'stripe_checkout_created',
      user_id: String(user_id),
      ip,
      details: { txRef, amount: amountCheck.value, sessionId: session.id },
      risk_level: 'low',
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        transactionReference: txRef,
        amount: amountCheck.value,
      },
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    logAudit({
      action: 'stripe_checkout_error',
      user_id: String(user_id),
      ip,
      details: { error: String(err) },
      risk_level: 'high',
    });
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }
}
