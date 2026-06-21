import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  checkPredictServerHealth,
  fetchMandateState,
  fetchOpenPositions,
  fetchOracleSVI,
  fetchStrikeList,
} from '@/lib/predict';

interface AuditIndexEntry {
  blobId: string;
  action: string;
  txDigest: string | null;
  timestamp: number;
  summary: string;
}

export async function GET() {
  const health = {
    predict: false,
    walrusAggregator: false,
    walrusPublisher: false,
    mandate: false,
  };

  try {
    health.predict = await checkPredictServerHealth();
    health.walrusAggregator = await checkHttpHealth(process.env.WALRUS_AGGREGATOR_URL);
    health.walrusPublisher = await checkHttpHealth(process.env.WALRUS_PUBLISHER_URL);

    if (!health.predict) {
      return NextResponse.json(
        { error: 'Predict server unreachable', health, serverUp: false },
        { status: 503 }
      );
    }

    const [oracle, strikes, auditIndex] = await Promise.all([
      fetchOracleSVI(),
      fetchStrikeList(),
      readAuditIndex(),
    ]);

    const managerAddress = process.env.PREDICT_MANAGER_ID;
    const mandateId = process.env.NEXT_PUBLIC_MANDATE_OBJECT_ID ?? process.env.MANDATE_OBJECT_ID;
    const [positions, mandate] = await Promise.all([
      managerAddress ? fetchOpenPositions(managerAddress) : Promise.resolve([]),
      mandateId ? fetchMandateState(mandateId) : Promise.resolve(null),
    ]);

    health.mandate = Boolean(mandate?.is_active);
    const latestAudit = auditIndex[0] ?? null;

    return NextResponse.json({
      oracle,
      strikes,
      positions,
      mandate,
      auditIndex,
      latestAudit,
      memorySignal: latestAudit?.summary ?? 'Waiting for the agent to write its first memory-influenced audit.',
      health,
      serverUp: true,
    });
  } catch (error) {
    console.error('API /agent error:', error);
    return NextResponse.json(
      { error: String(error), health, serverUp: false },
      { status: 500 }
    );
  }
}

async function checkHttpHealth(url?: string): Promise<boolean> {
  if (!url) return false;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

async function readAuditIndex(): Promise<AuditIndexEntry[]> {
  const indexPath = path.resolve(process.cwd(), process.env.AUDIT_INDEX_PATH ?? 'data/audit-index.json');
  try {
    const raw = await readFile(indexPath, 'utf8');
    return (JSON.parse(raw) as AuditIndexEntry[]).slice(0, 20);
  } catch {
    return [];
  }
}
