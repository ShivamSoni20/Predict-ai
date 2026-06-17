import { createMemWalClient } from '@mysten-incubation/memwal';

// ── MemWal Client Setup ──
const memwal = createMemWalClient({
  agentAddress: process.env.MEMWAL_AGENT_ADDRESS!,
  delegateKey: process.env.MEMWAL_DELEGATE_KEY!,
  network: 'testnet',
});

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
}): Promise<string> {
  const blob = JSON.stringify({
    ...reasoning,
    stored_at: Date.now(),
    agent_version: '1.0.0',
  });

  const result = await memwal.storeMemory({
    content: blob,
    tags: ['reasoning', 'predictai', reasoning.decision],
  });

  return result.blobId;
}

/**
 * Load agent's historical memory to improve decisions
 * Uses MemWal's semantic retrieval
 */
export async function loadAgentMemory(
  context: string
): Promise<AgentMemory | null> {
  try {
    const memories = await memwal.retrieveMemories({
      query: context,
      limit: 10,
      tags: ['predictai'],
    });

    if (!memories || memories.length === 0) return null;

    // Parse the most relevant memory
    const latest = memories[0];
    return JSON.parse(latest.content) as AgentMemory;
  } catch {
    return null;
  }
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

  await memwal.storeMemory({
    content: JSON.stringify(updated),
    tags: ['predictai', 'outcome', params.outcome.toLowerCase()],
  });
}

function calculateWinRate(
  past: AgentMemory['past_positions'],
  latest: 'WIN' | 'LOSS'
): number {
  const all = [...past, { outcome: latest, direction: 'UP', strike: 0, iv_at_entry: 0, pnl: 0 }];
  const wins = all.filter(p => p.outcome === 'WIN').length;
  return wins / all.length;
}
