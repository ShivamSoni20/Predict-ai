import { NextRequest, NextResponse } from 'next/server';
// We are mocking the data fetching for the frontend demo based on the dev plan

export async function GET(req: NextRequest) {
  try {
    // Mock oracle response
    const oracle = {
      atm_iv: 0.428,
      skew: -0.032,
      slope: 0.015,
      timestamp: Date.now() - 47000,
      expiry_ms: Date.now() + 3600 * 1000,
      strike_atm: 103284,
    };
    
    // Mock strikes response
    const strikes = [
      { strike: 90000, iv: 0.48, premium_up: 0.85, premium_down: 0.15 },
      { strike: 100000, iv: 0.43, premium_up: 0.45, premium_down: 0.55 },
      { strike: 103000, iv: 0.428, premium_up: 0.234, premium_down: 0.766 },
    ];

    // Mock positions response
    const positions = [
      { position_id: 'pos1', direction: 'UP', strike: 103000, size_dusdc: 50, entry_premium: 0.234, expiry_ms: Date.now() + 3600 * 1000, status: 'OPEN', pnl: 0 },
      { position_id: 'pos2', direction: 'DOWN', strike: 105000, size_dusdc: 50, entry_premium: 0.3, expiry_ms: Date.now() - 3600 * 1000, status: 'SETTLED', pnl: 18.40 }
    ];

    return NextResponse.json({ oracle, strikes, positions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (action === 'kill') {
    return NextResponse.json({ success: true, message: 'Kill signal sent' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
