import { NextRequest, NextResponse } from 'next/server';
import { getQuizById } from '@/lib/db';

// GET /api/quizzes/:id - Get quiz detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quiz = await getQuizById(id);

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: quiz });
}
