import { NextRequest, NextResponse } from 'next/server';

// GET /api/payment/ozow/return
// Handles redirect from Ozow after payment (success/cancel/error)
// Redirects user back to wallet page with status
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') || 'unknown';
  const ref = request.nextUrl.searchParams.get('ref') || '';

  // Redirect to wallet page with payment result
  const walletUrl = new URL('/wallet', request.url);
  walletUrl.searchParams.set('payment', status);
  if (ref) walletUrl.searchParams.set('ref', ref);

  return NextResponse.redirect(walletUrl);
}
