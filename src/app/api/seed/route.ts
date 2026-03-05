import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// POST /api/seed - Seed database with test data (dev only)
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const db = getServiceClient();
  const errors: string[] = [];

  try {
    // 1. Create test user
    const { data: user, error: userErr } = await db
      .from('users')
      .upsert({
        phone: '+27812345678',
        display_name: 'Test Player',
        balance: 500_00, // R500 in cents
        free_bet_balance: 50_00, // R50 in cents
        referral_code: 'TESTPLAY',
        status: 'active',
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (userErr) errors.push(`user: ${userErr.message}`);

    // 2. Create test admin user
    const { error: adminErr } = await db
      .from('users')
      .upsert({
        phone: '+27800000001',
        display_name: 'Admin',
        balance: 0,
        free_bet_balance: 0,
        referral_code: 'ADMIN001',
        status: 'active',
        is_admin: true,
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (adminErr) errors.push(`admin: ${adminErr.message}`);

    // 3. Create active quiz - Soccer Trivia
    const quiz1Expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const quiz1Draw = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: quiz1, error: q1Err } = await db
      .from('quizzes')
      .insert({
        question: 'Who won the 2010 FIFA World Cup held in South Africa?',
        category: 'Soccer',
        status: 'active',
        entry_fee: 5_00, // R5
        prize_pool: 100_000_00, // R100,000
        winner_count: 100,
        participants: 0,
        correct_count: 0,
        expires_at: quiz1Expires,
        draw_at: quiz1Draw,
      })
      .select()
      .single();

    if (q1Err) errors.push(`quiz1: ${q1Err.message}`);

    if (quiz1) {
      const { error: o1Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz1.id, label: 'Spain', pick_count: 0 },
        { quiz_id: quiz1.id, label: 'Netherlands', pick_count: 0 },
        { quiz_id: quiz1.id, label: 'Germany', pick_count: 0 },
        { quiz_id: quiz1.id, label: 'Brazil', pick_count: 0 },
      ]);
      if (o1Err) errors.push(`quiz1 options: ${o1Err.message}`);
    }

    // 4. Create active quiz - General Knowledge
    const quiz2Expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const quiz2Draw = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();

    const { data: quiz2, error: q2Err } = await db
      .from('quizzes')
      .insert({
        question: 'What is the capital city of South Africa (administrative)?',
        category: 'General Knowledge',
        status: 'active',
        entry_fee: 10_00, // R10
        prize_pool: 500_000_00, // R500,000
        winner_count: 50,
        participants: 0,
        correct_count: 0,
        expires_at: quiz2Expires,
        draw_at: quiz2Draw,
      })
      .select()
      .single();

    if (q2Err) errors.push(`quiz2: ${q2Err.message}`);

    if (quiz2) {
      const { error: o2Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz2.id, label: 'Pretoria', pick_count: 0 },
        { quiz_id: quiz2.id, label: 'Cape Town', pick_count: 0 },
        { quiz_id: quiz2.id, label: 'Johannesburg', pick_count: 0 },
        { quiz_id: quiz2.id, label: 'Durban', pick_count: 0 },
      ]);
      if (o2Err) errors.push(`quiz2 options: ${o2Err.message}`);
    }

    // 5. Create active quiz - Cricket
    const quiz3Expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { data: quiz3, error: q3Err } = await db
      .from('quizzes')
      .insert({
        question: 'How many players are on a cricket team?',
        category: 'Cricket',
        status: 'active',
        entry_fee: 2_00, // R2
        prize_pool: 20_000_00, // R20,000
        winner_count: 200,
        participants: 0,
        correct_count: 0,
        expires_at: quiz3Expires,
      })
      .select()
      .single();

    if (q3Err) errors.push(`quiz3: ${q3Err.message}`);

    if (quiz3) {
      const { error: o3Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz3.id, label: '11', pick_count: 0 },
        { quiz_id: quiz3.id, label: '12', pick_count: 0 },
        { quiz_id: quiz3.id, label: '10', pick_count: 0 },
        { quiz_id: quiz3.id, label: '15', pick_count: 0 },
      ]);
      if (o3Err) errors.push(`quiz3 options: ${o3Err.message}`);
    }

    // 6. Give test user a signup bonus transaction
    if (user) {
      await db.from('transactions').insert({
        user_id: user.id,
        type: 'signup_bonus',
        amount: 500_00,
        balance_after: 500_00,
        fund_type: 'balance',
        description: 'Welcome bonus - R500 free credit',
      });
      await db.from('transactions').insert({
        user_id: user.id,
        type: 'signup_bonus',
        amount: 50_00,
        balance_after: 50_00,
        fund_type: 'free_bet',
        description: 'Welcome free bet - R50',
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Seed completed with errors',
        errors,
        user_id: user?.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Seed data created successfully',
      data: {
        user_id: user?.id,
        user_phone: '+27812345678',
        quizzes: [quiz1?.id, quiz2?.id, quiz3?.id].filter(Boolean),
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({
      success: false,
      error: String(err),
      errors,
    }, { status: 500 });
  }
}
