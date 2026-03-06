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

    // 3. Create active quiz - Soccer Trivia (user has NOT joined this one)
    const quiz1Expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const quiz1Draw = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: quiz1, error: q1Err } = await db
      .from('quizzes')
      .insert({
        question: 'Who won the 2010 FIFA World Cup held in South Africa?',
        category: 'Soccer',
        status: 'active',
        entry_fee: 5_00,
        prize_pool: 100_000_00,
        winner_count: 100,
        participants: 0,
        correct_count: 0,
        expires_at: quiz1Expires,
        draw_at: quiz1Draw,
      })
      .select()
      .single();

    if (q1Err) errors.push(`quiz1: ${q1Err.message}`);

    let quiz1Options: { id: string; label: string }[] = [];
    if (quiz1) {
      const { data: opts, error: o1Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz1.id, label: 'Spain' },
        { quiz_id: quiz1.id, label: 'Netherlands' },
        { quiz_id: quiz1.id, label: 'Germany' },
        { quiz_id: quiz1.id, label: 'Brazil' },
      ]).select('id, label');
      if (o1Err) errors.push(`quiz1 options: ${o1Err.message}`);
      quiz1Options = opts || [];
    }

    // 4. Create active quiz - General Knowledge (user WILL join this one)
    const quiz2Expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const quiz2Draw = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();

    const { data: quiz2, error: q2Err } = await db
      .from('quizzes')
      .insert({
        question: 'What is the capital city of South Africa (administrative)?',
        category: 'General Knowledge',
        status: 'active',
        entry_fee: 10_00,
        prize_pool: 500_000_00,
        winner_count: 50,
        participants: 1, // test user already joined
        correct_count: 0,
        expires_at: quiz2Expires,
        draw_at: quiz2Draw,
      })
      .select()
      .single();

    if (q2Err) errors.push(`quiz2: ${q2Err.message}`);

    let quiz2Options: { id: string; label: string }[] = [];
    if (quiz2) {
      const { data: opts, error: o2Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz2.id, label: 'Pretoria' },
        { quiz_id: quiz2.id, label: 'Cape Town' },
        { quiz_id: quiz2.id, label: 'Johannesburg' },
        { quiz_id: quiz2.id, label: 'Durban' },
      ]).select('id, label');
      if (o2Err) errors.push(`quiz2 options: ${o2Err.message}`);
      quiz2Options = opts || [];
    }

    // 5. Create active quiz - Cricket (user WILL join this one too)
    const quiz3Expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const quiz3Draw = new Date(Date.now() + 13 * 60 * 60 * 1000).toISOString();

    const { data: quiz3, error: q3Err } = await db
      .from('quizzes')
      .insert({
        question: 'How many players are on a cricket team?',
        category: 'Cricket',
        status: 'active',
        entry_fee: 2_00,
        prize_pool: 20_000_00,
        winner_count: 200,
        participants: 1, // test user already joined
        correct_count: 0,
        expires_at: quiz3Expires,
        draw_at: quiz3Draw,
      })
      .select()
      .single();

    if (q3Err) errors.push(`quiz3: ${q3Err.message}`);

    let quiz3Options: { id: string; label: string }[] = [];
    if (quiz3) {
      const { data: opts, error: o3Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz3.id, label: '11' },
        { quiz_id: quiz3.id, label: '12' },
        { quiz_id: quiz3.id, label: '10' },
        { quiz_id: quiz3.id, label: '15' },
      ]).select('id, label');
      if (o3Err) errors.push(`quiz3 options: ${o3Err.message}`);
      quiz3Options = opts || [];
    }

    // 6. Create settled quiz - Rugby (shows past results with winners)
    const settledAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: quiz4, error: q4Err } = await db
      .from('quizzes')
      .insert({
        question: 'Which country has won the most Rugby World Cups?',
        category: 'Rugby',
        status: 'settled',
        entry_fee: 5_00,
        prize_pool: 50_000_00,
        winner_count: 50,
        participants: 328,
        correct_count: 186,
        expires_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        settled_at: settledAt,
      })
      .select()
      .single();

    if (q4Err) errors.push(`quiz4: ${q4Err.message}`);

    if (quiz4) {
      const { data: q4Opts, error: o4Err } = await db.from('quiz_options').insert([
        { quiz_id: quiz4.id, label: 'South Africa' },
        { quiz_id: quiz4.id, label: 'New Zealand' },
        { quiz_id: quiz4.id, label: 'Australia' },
        { quiz_id: quiz4.id, label: 'England' },
      ]).select('id, label');
      if (o4Err) errors.push(`quiz4 options: ${o4Err.message}`);

      // Set correct answer to "South Africa"
      const correctOpt = q4Opts?.find(o => o.label === 'South Africa');
      if (correctOpt) {
        await db.from('quizzes')
          .update({ correct_option_id: correctOpt.id })
          .eq('id', quiz4.id);
      }

      // Add mock winners
      if (user) {
        await db.from('quiz_winners').insert([
          { quiz_id: quiz4.id, user_id: user.id, display_name: 'Te***er', prize_amount: 1000_00 },
        ]);
      }
    }

    // 7. Create bet records (user participated in quiz2 and quiz3)
    if (user) {
      // User picked "Pretoria" for quiz2
      const pretoriaOpt = quiz2Options.find(o => o.label === 'Pretoria');
      if (quiz2 && pretoriaOpt) {
        const { error: b2Err } = await db.from('bets').insert({
          user_id: user.id,
          bet_type: 'quiz',
          quiz_id: quiz2.id,
          option_id: pretoriaOpt.id,
          amount: 10_00,
          fund_source: 'balance',
          potential_win: 0,
          status: 'pending',
        });
        if (b2Err) errors.push(`bet2: ${b2Err.message}`);

        // Update pick count for the option
        await db.from('quiz_options')
          .update({ bet_count: 1 })
          .eq('id', pretoriaOpt.id)
          .then(() => {}, () => {});
      }

      // User picked "11" for quiz3
      const elevenOpt = quiz3Options.find(o => o.label === '11');
      if (quiz3 && elevenOpt) {
        const { error: b3Err } = await db.from('bets').insert({
          user_id: user.id,
          bet_type: 'quiz',
          quiz_id: quiz3.id,
          option_id: elevenOpt.id,
          amount: 2_00,
          fund_source: 'balance',
          potential_win: 0,
          status: 'pending',
        });
        if (b3Err) errors.push(`bet3: ${b3Err.message}`);

        await db.from('quiz_options')
          .update({ bet_count: 1 })
          .eq('id', elevenOpt.id)
          .then(() => {}, () => {});
      }

      // Also create a won bet for the settled quiz4
      if (quiz4) {
        const saOpt = (await db.from('quiz_options')
          .select('id')
          .eq('quiz_id', quiz4.id)
          .eq('label', 'South Africa')
          .single()).data;

        if (saOpt) {
          await db.from('bets').insert({
            user_id: user.id,
            bet_type: 'quiz',
            quiz_id: quiz4.id,
            option_id: saOpt.id,
            amount: 5_00,
            fund_source: 'balance',
            potential_win: 0,
            actual_win: 1000_00,
            status: 'won',
            settled_at: settledAt,
          });
        }
      }
    }

    // 8. Give test user a signup bonus transaction
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
        quizzes: {
          active_not_joined: quiz1?.id,
          active_joined: [quiz2?.id, quiz3?.id].filter(Boolean),
          settled: quiz4?.id,
        },
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
