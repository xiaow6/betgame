import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByPhone, createUser } from '@/lib/db';
import { SIGNUP_BONUS } from '@/lib/constants';

// GET /api/user?id=xxx or ?phone=xxx - Get user profile
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const phone = request.nextUrl.searchParams.get('phone');

  if (id) {
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  }

  if (phone) {
    const user = await getUserByPhone(phone);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  }

  return NextResponse.json({ error: 'id or phone required' }, { status: 400 });
}

// POST /api/user - Register / login user
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, display_name, referred_by } = body;

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  // Check if user exists
  const existing = await getUserByPhone(phone);
  if (existing) {
    return NextResponse.json({ success: true, data: existing, is_new: false });
  }

  // Generate referral code
  const codeBytes = new Uint8Array(4);
  crypto.getRandomValues(codeBytes);
  const referralCode = Array.from(codeBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  const user = await createUser({
    phone,
    display_name: String(display_name || phone.slice(-4)),
    referral_code: referralCode,
    referred_by: referred_by ? String(referred_by) : undefined,
    balance: SIGNUP_BONUS,
    free_bet_balance: 0,
  });

  if (!user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: user, is_new: true });
}
