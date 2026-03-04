import { NextRequest, NextResponse } from 'next/server';

// TV API - Endpoints for broadcast integration
// Protected by API token (checked in middleware)

// GET /api/tv/draws - List active/pending draws
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-tv-api-key');
  if (!token || token !== process.env.TV_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Mock response - will use Supabase in production
  const draws = [
    {
      id: 'draw-001',
      title: 'Man United vs Liverpool - Lucky Draw',
      status: 'pending',
      prize_amount: 500000,
      total_eligible: 137,
      winner_count: 3,
      scheduled_at: '2026-03-03T19:30:00Z',
    },
  ];

  return NextResponse.json({ success: true, data: draws });
}
