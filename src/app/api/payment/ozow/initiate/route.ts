import { NextRequest, NextResponse } from 'next/server';
import { getOzowConfig, generateRequestHash, OZOW_API_URL } from '@/lib/ozow';
import { validateAmount, validateUserId, getClientIp, logAudit } from '@/lib/security';
import { getServiceClient } from '@/lib/supabase';

// Deposit limits (cents)
const MIN_DEPOSIT = 500;       // R5
const MAX_DEPOSIT = 1_000_000; // R10,000

// POST /api/payment/ozow/initiate
// Creates a payment request with Ozow and returns the redirect URL
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, amount } = body;

  // Validate inputs
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
    const config = getOzowConfig();

    // Generate unique transaction reference
    const txRef = `BG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amountRands = (amountCheck.value / 100).toFixed(2); // Convert cents to Rands

    // Build base URL from request
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const cancelUrl = `${baseUrl}/api/payment/ozow/return?status=cancelled&ref=${txRef}`;
    const errorUrl = `${baseUrl}/api/payment/ozow/return?status=error&ref=${txRef}`;
    const successUrl = `${baseUrl}/api/payment/ozow/return?status=success&ref=${txRef}`;
    const notifyUrl = `${baseUrl}/api/payment/ozow/notify`;

    // Generate hash
    const hashCheck = generateRequestHash({
      siteCode: config.siteCode,
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: amountRands,
      transactionReference: txRef,
      bankReference: txRef.slice(0, 20),
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
      isTest: config.isTest,
      privateKey: config.privateKey,
    });

    // Store pending transaction in DB for later verification
    await db.from('transactions').insert({
      user_id: String(user_id),
      type: 'deposit',
      amount: 0, // Will be updated on notification
      balance_after: 0,
      fund_type: 'balance',
      reference_id: txRef,
      description: `Ozow deposit pending - ${txRef}`,
    });

    // POST to Ozow API
    const ozowPayload = {
      SiteCode: config.siteCode,
      CountryCode: 'ZA',
      CurrencyCode: 'ZAR',
      Amount: amountRands,
      TransactionReference: txRef,
      BankReference: txRef.slice(0, 20),
      Customer: user.phone,
      CancelUrl: cancelUrl,
      ErrorUrl: errorUrl,
      SuccessUrl: successUrl,
      NotifyUrl: notifyUrl,
      IsTest: config.isTest,
      HashCheck: hashCheck,
    };

    const ozowRes = await fetch(`${OZOW_API_URL}/postpaymentrequest`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'ApiKey': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ozowPayload),
    });

    const ozowData = await ozowRes.json();

    if (!ozowRes.ok || ozowData.errorMessage) {
      logAudit({
        action: 'ozow_initiate_failed',
        user_id: String(user_id),
        ip,
        details: { error: ozowData.errorMessage || ozowRes.statusText, txRef },
        risk_level: 'medium',
      });
      return NextResponse.json({
        error: 'Payment initiation failed',
        details: ozowData.errorMessage,
      }, { status: 502 });
    }

    logAudit({
      action: 'ozow_initiate_success',
      user_id: String(user_id),
      ip,
      details: { txRef, amount: amountCheck.value },
      risk_level: 'low',
    });

    // Return the Ozow payment URL for the frontend to redirect to
    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: ozowData.url,
        transactionReference: txRef,
        amount: amountCheck.value,
      },
    });
  } catch (err) {
    console.error('Ozow initiate error:', err);
    logAudit({
      action: 'ozow_initiate_error',
      user_id: String(user_id),
      ip,
      details: { error: String(err) },
      risk_level: 'high',
    });
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }
}
