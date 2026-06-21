import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOracleSVI,
  fetchStrikeList,
  fetchOpenPositions,
  checkPredictServerHealth,
} from '@/lib/predict';

export async function GET(req: NextRequest) {
  try {
    const serverUp = await checkPredictServerHealth();
    if (!serverUp) {
      return NextResponse.json(
        { error: 'Predict server unreachable', serverUp: false },
        { status: 503 }
      );
    }

    const [oracle, strikes] = await Promise.all([
      fetchOracleSVI(),
      fetchStrikeList(),
    ]);

    const managerAddress = process.env.PREDICT_MANAGER_ID;
    const positions = managerAddress
      ? await fetchOpenPositions(managerAddress)
      : [];

    return NextResponse.json({ oracle, strikes, positions, serverUp: true });
  } catch (error) {
    console.error('API /agent error:', error);
    return NextResponse.json(
      { error: String(error), serverUp: false },
      { status: 500 }
    );
  }
}
