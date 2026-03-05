import { NextResponse } from 'next/server';
import { getActiveQuizzes, getSettledQuizzes, createQuiz } from '@/lib/db';
import { NextRequest } from 'next/server';

// GET /api/quizzes - List active + recent settled quizzes
export async function GET() {
  const [active, settled] = await Promise.all([
    getActiveQuizzes(),
    getSettledQuizzes(5),
  ]);
  return NextResponse.json({ success: true, data: { active, settled } });
}

// POST /api/quizzes - Create quiz (admin only)
export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;
  if (!adminToken && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { question, category, entry_fee, prize_pool, winner_count, expires_hours, options } = body;

  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const expiresAt = new Date(
    Date.now() + (Number(expires_hours) || 24) * 60 * 60 * 1000
  ).toISOString();

  const quiz = await createQuiz({
    question: String(question),
    category: String(category || 'other'),
    entry_fee: Number(entry_fee) || 1000,
    prize_pool: Number(prize_pool) || 10000000,
    winner_count: Number(winner_count) || 100,
    expires_at: expiresAt,
    options: options.map(String),
  });

  if (!quiz) {
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: quiz });
}
