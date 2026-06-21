import { MemWal } from '@mysten-incubation/memwal';

// ── MemWal Client Setup ──
let memwalInstance: any = null;
function getMemWal() {
  if (!memwalInstance) {
    if (!process.env.MEMWAL_DELEGATE_KEY || !process.env.MEMWAL_AGENT_ADDRESS) {
      throw new Error("MemWal credentials not set");
    }
    memwalInstance = MemWal.create({
      key: process.env.MEMWAL_DELEGATE_KEY,
      accountId: process.env.MEMWAL_AGENT_ADDRESS,
    });
  }
  return memwalInstance;
}

export async function verifyMemWalSetup(): Promise<boolean> {
  try {
    // Just a ping or checking if addresses are set
    return !!process.env.MEMWAL_AGENT_ADDRESS && !!process.env.MEMWAL_DELEGATE_KEY;
  } catch {
    return false;
  }
}

// ── Memory Types ──
export interface AgentMemory {
  session_id: string;
  past_positions: Array<{
    direction: 'UP' | 'DOWN';
    strike: number;
    iv_at_entry: number;
    outcome: 'WIN' | 'LOSS' | 'OPEN';
    pnl: number;
  }>;
  iv_history: Array<{ iv: number; timestamp: number }>;
  total_positions: number;
  win_rate: number;
  last_decision: string;
}

export interface MemorySignal {
  summary: string;
  comparable_outcomes: number;
  comparable_wins: number;
  win_rate: number | null;
  confidence_adjustment: number;
  last_decision: string | null;
  iv_history: Array<{ iv: number; timestamp: number }>;
}

/**
 * Store agent reasoning as a Walrus blob via MemWal
 * Returns the blob CID for on-chain reference
 */
export async function storeReasoning(reasoning: {
  oracle: {
    atm_iv: number;
    skew: number;
    timestamp: number;
  };
  decision: string;
  direction?: 'UP' | 'DOWN';
  strike?: number;
  confidence: number;
  explanation: string;
  memory_signal?: MemorySignal;
}): Promise<string> {
  const blob = JSON.stringify({
    ...reasoning,
    stored_at: Date.now(),
    agent_version: '1.0.0',
  });

  const result = await getMemWal().rememberAndWait(blob, 'predictai');
  return result.blob_id;
}

/**
 * Load agent's historical memory to improve decisions
 * Uses MemWal's semantic retrieval
 */
export async function loadAgentMemory(
  context: string
): Promise<AgentMemory | null> {
  try {
    const memories = await getMemWal().recall({
      query: context,
      limit: 10,
      namespace: 'predictai',
    });

    if (!memories.results || memories.results.length === 0) return null;

    // Parse the most relevant memory
    const latest = memories.results[0];
    return JSON.parse(latest.text) as AgentMemory;
  } catch {
    return null;
  }
}

export async function buildMemorySignal(params: {
  atm_iv: number;
  skew: number;
}): Promise<MemorySignal> {
  const memory = await loadAgentMemory(
    `BTC volatility outcome near IV ${params.atm_iv} skew ${params.skew}`
  );

  const positions = memory?.past_positions ?? [];
  const comparable = positions.filter((position) =>
    Math.abs(position.iv_at_entry - params.atm_iv) <= 0.08
  );
  const comparableWins = comparable.filter((position) => position.outcome === 'WIN').length;
  const winRate = comparable.length ? comparableWins / comparable.length : null;
  const confidenceAdjustment = winRate === null
    ? 0
    : Math.max(-0.1, Math.min(0.1, (winRate - 0.5) * 0.2));

  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
  const summary = comparable.length
    ? `Similar past setup: ${comparableWins}/${comparable.length} wins, confidence ${confidenceAdjustment >= 0 ? '+' : ''}${pct(confidenceAdjustment)}.`
    : 'No comparable past outcomes yet, confidence adjustment +0%.';

  return {
    summary,
    comparable_outcomes: comparable.length,
    comparable_wins: comparableWins,
    win_rate: winRate,
    confidence_adjustment: confidenceAdjustment,
    last_decision: memory?.last_decision ?? null,
    iv_history: memory?.iv_history?.slice(-10) ?? [],
  };
}

/**
 * Update win/loss record after position settles
 */
export async function recordOutcome(params: {
  direction: 'UP' | 'DOWN';
  strike: number;
  iv_at_entry: number;
  outcome: 'WIN' | 'LOSS';
  pnl: number;
}): Promise<void> {
  const memory = await loadAgentMemory('past positions outcomes');
  const updated: AgentMemory = {
    session_id: Date.now().toString(),
    past_positions: [
      ...(memory?.past_positions ?? []),
      { ...params, outcome: params.outcome },
    ].slice(-50),  // keep last 50 positions
    iv_history: memory?.iv_history ?? [],
    total_positions: (memory?.total_positions ?? 0) + 1,
    win_rate: calculateWinRate(memory?.past_positions ?? [], params.outcome),
    last_decision: `${params.direction} @ ${params.strike}`,
  };

  await getMemWal().rememberAndWait(JSON.stringify(updated), 'predictai');
}

function calculateWinRate(
  past: AgentMemory['past_positions'],
  latest: 'WIN' | 'LOSS'
): number {
  const all = [...past, { outcome: latest, direction: 'UP', strike: 0, iv_at_entry: 0, pnl: 0 }];
  const wins = all.filter(p => p.outcome === 'WIN').length;
  return wins / all.length;
}
