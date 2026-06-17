import { NextRequest, NextResponse } from 'next/server';

const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get('id');
  if (!blobId) return NextResponse.json({ error: 'No blob ID' }, { status: 400 });

  try {
    const response = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
    const text = await response.text();
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
