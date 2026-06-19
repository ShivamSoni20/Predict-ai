import Anthropic from '@anthropic-ai/sdk';
import { OracleSVI } from './executor';
import { loadAgentMemory } from './memory';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface AgentDecision {
  action: 'OPEN_HEDGE' | 'HOLD' | 'SKIP';
  direction?: 'UP' | 'DOWN';
  strike?: number;
  size_dusdc?: number;
  confidence: number;
  explanation: string;
  reasoning_steps: string[];
}

/**
 * Core agent brain — Claude decides whether to hedge
 * Uses MemWal memory to improve decisions over time
 */
export async function makeDecision(params: {
  oracle: OracleSVI;
  strikes: Array<{ strike: number; iv: number; premium_up: number; premium_down: number }>;
  budget_remaining: number;
  open_positions: number;
}): Promise<AgentDecision> {

  // Load historical memory from Walrus
  const memory = await loadAgentMemory(
    `BTC volatility ${params.oracle.atm_iv} skew ${params.oracle.skew} decision`
  );

  const systemPrompt = `You are PredictAI, an autonomous hedging agent on the Sui blockchain.
You analyze DeepBook Predict's volatility surface and decide whether to open binary hedge positions.

Your goal: protect a portfolio from BTC volatility by opening directional binary positions when the signal is strong.

Rules you MUST follow:
- Only open a position if confidence >= ${process.env.CONFIDENCE_THRESHOLD ?? 0.65}
- Never exceed budget cap — current remaining: ${params.budget_remaining} dUSDC
- Max 3 open positions at once — current: ${params.open_positions}
- Position size: exactly ${process.env.POSITION_SIZE ?? 50} dUSDC per trade

Output ONLY valid JSON matching this exact schema:
{
  "action": "OPEN_HEDGE" | "HOLD" | "SKIP",
  "direction": "UP" | "DOWN" | null,
  "strike": <number> | null,
  "size_dusdc": <number> | null,
  "confidence": <0.0 to 1.0>,
  "explanation": "<one sentence plain English>",
  "reasoning_steps": ["<step 1>", "<step 2>", "<step 3>"]
}`;

  const userMessage = `Current market data:

ORACLE SVI:
- ATM IV: ${(params.oracle.atm_iv * 100).toFixed(1)}%
- Skew: ${params.oracle.skew.toFixed(3)} (negative = bearish lean)
- Slope: ${params.oracle.slope.toFixed(3)}
- ATM Strike: $${params.oracle.strike_atm.toLocaleString()}
- Next expiry: ${new Date(params.oracle.expiry_ms).toISOString()}
- Data age: ${Math.round((Date.now() - params.oracle.timestamp) / 1000)}s old

AVAILABLE STRIKES:
${params.strikes.map(s =>
  `  $${s.strike.toLocaleString()}: IV=${(s.iv * 100).toFixed(1)}%, UP premium=${s.premium_up.toFixed(3)}, DOWN premium=${s.premium_down.toFixed(3)}`
).join('\n')}

HISTORICAL MEMORY (from Walrus):
${memory ? `
- Win rate: ${(memory.win_rate * 100).toFixed(1)}%
- Total positions: ${memory.total_positions}
- Last decision: ${memory.last_decision}
- Recent IV history: ${memory.iv_history.slice(-3).map(h => (h.iv * 100).toFixed(1) + '%').join(', ')}
` : '- No historical memory yet (first session)'}

CONSTRAINTS:
- Budget remaining: ${params.budget_remaining} dUSDC
- Open positions: ${params.open_positions}/3 max
- Confidence threshold: ${Number(process.env.CONFIDENCE_THRESHOLD ?? 0.65) * 100}%

Analyze and decide. Output JSON only.`;

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1000,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON response
  const clean = text.replace(/```json|```/g, '').trim();
  const decision = JSON.parse(clean) as AgentDecision;

  return decision;
}
