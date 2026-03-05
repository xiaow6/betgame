import { NextRequest, NextResponse } from 'next/server';

// GET /api/tv/draws/:id - Get draw details with masked participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('x-tv-api-key');
  if (!token || token !== process.env.TV_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Mock response
  const draw = {
    id,
    title: 'Man United vs Liverpool - Lucky Draw',
    status: 'pending',
    prize_amount: 500000,
    total_eligible: 137,
    winner_count: 3,
    scheduled_at: '2026-03-03T19:30:00Z',
    participants: [
      { display_name_masked: 'Th***do', bet_amount: 5000 },
      { display_name_masked: 'Si***lo', bet_amount: 3000 },
      { display_name_masked: 'Ma***wa', bet_amount: 2000 },
      // ... truncated for TV display
    ],
  };

  return NextResponse.json({ success: true, data: draw });
}

// POST /api/tv/draws/:id/trigger - Trigger draw from TV studio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('x-tv-api-key');
  if (!token || token !== process.env.TV_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body; // 'start', 'draw_next', 'complete'

  // Mock - in production this would:
  // 1. Update draw status
  // 2. Select random winner using crypto.getRandomValues
  // 3. Record in audit log with seed
  // 4. Credit prize to winner
  // 5. Send push notification to winner

  const response: Record<string, unknown> = {
    draw_id: id,
    action,
    timestamp: new Date().toISOString(),
  };

  if (action === 'start') {
    response.status = 'drawing';
    response.message = 'Draw started';
  } else if (action === 'draw_next') {
    response.winner = {
      display_name_masked: 'Th***do',
      prize_amount: 250000,
      position: 1,
    };
    response.message = 'Winner selected';
    response.audit = {
      seed: (() => { const b = new Uint8Array(8); crypto.getRandomValues(b); return '0x' + Array.from(b).map(x => x.toString(16).padStart(2, '0')).join(''); })(),
      algorithm: 'crypto.getRandomValues weighted',
      timestamp: new Date().toISOString(),
    };
  } else if (action === 'complete') {
    response.status = 'completed';
    response.message = 'Draw completed, prizes credited';
  }

  return NextResponse.json({ success: true, data: response });
}
