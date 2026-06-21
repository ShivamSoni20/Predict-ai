import Anthropic from '@anthropic-ai/sdk';
import { OracleSVI } from './executor.js';
import { MemorySignal } from './memory.js';

export interface AgentDecision {
  action: 'OPEN_HEDGE' | 'HOLD' | 'SKIP';
  direction?: 'UP' | 'DOWN';
  strike?: number;
  size_dusdc?: number;
  confidence: number;
  explanation: string;
  reasoning_steps: string[];
}

export async function makeDecision(params: {
  oracle: OracleSVI;
  strikes: Array<{ strike: number; iv: number; premium_up: number; premium_down: number }>;
  budget_remaining: number;
  open_positions: number;
  memory_signal: MemorySignal;
}): Promise<AgentDecision> {
  const model = process.env.ANTHROPIC_MODEL ?? process.env.OPENROUTER_MODEL ?? 'claude-3-5-sonnet-latest';

  const systemPrompt = `You are PredictAI, an autonomous hedging agent on the Sui blockchain.
You analyze DeepBook Predict's volatility surface and decide whether to open binary hedge positions.

Your goal: protect a portfolio from BTC volatility by opening directional binary positions when the signal is strong.

Rules you MUST follow:
- Only open a position if confidence >= ${process.env.CONFIDENCE_THRESHOLD ?? 0.65}
- Never exceed budget cap. Current remaining: ${params.budget_remaining} dUSDC
- Max 3 open positions at once. Current: ${params.open_positions}
- Position size: exactly ${process.env.POSITION_SIZE ?? 50} dUSDC per trade
- Apply the memory signal conservatively. It may adjust confidence, but it must not override mandate, budget, or market constraints.

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

MEMORY SIGNAL (from Walrus/MemWal):
- ${params.memory_signal.summary}
- Comparable outcomes: ${params.memory_signal.comparable_outcomes}
- Comparable wins: ${params.memory_signal.comparable_wins}
- Win rate: ${params.memory_signal.win_rate === null ? 'n/a' : (params.memory_signal.win_rate * 100).toFixed(1) + '%'}
- Confidence adjustment: ${(params.memory_signal.confidence_adjustment * 100).toFixed(1)}%
- Last decision: ${params.memory_signal.last_decision ?? 'none'}
- Recent IV history: ${params.memory_signal.iv_history.length ? params.memory_signal.iv_history.slice(-3).map((h) => (h.iv * 100).toFixed(1) + '%').join(', ') : 'none'}

CONSTRAINTS:
- Budget remaining: ${params.budget_remaining} dUSDC
- Open positions: ${params.open_positions}/3 max
- Confidence threshold: ${Number(process.env.CONFIDENCE_THRESHOLD ?? 0.65) * 100}%

Analyze and decide. Output JSON only.`;

  const text = await callReasoningModel({ model, systemPrompt, userMessage });
  return parseAgentDecision(text);
}

async function callReasoningModel(params: {
  model: string;
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'https://github.com/ShivamSoni20/Predict-ai',
        'X-Title': process.env.OPENROUTER_APP_NAME ?? 'PredictAI Hedger',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.6',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${body.slice(0, 300)}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const response = await claude.messages.create({
    model: params.model,
    max_tokens: 1000,
    messages: [{ role: 'user', content: params.userMessage }],
    system: params.systemPrompt,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

export function parseAgentDecision(text: string): AgentDecision {
  const fallback: AgentDecision = {
    action: 'HOLD',
    confidence: 0,
    explanation: 'Model response was invalid, so the agent held position for safety.',
    reasoning_steps: ['Invalid model response', 'Fallback policy selected HOLD', 'No transaction submitted'],
  };

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const decision = JSON.parse(clean) as Partial<AgentDecision>;
    const validAction = decision.action === 'OPEN_HEDGE' || decision.action === 'HOLD' || decision.action === 'SKIP';
    const validConfidence = typeof decision.confidence === 'number'
      && decision.confidence >= 0
      && decision.confidence <= 1;
    const validReasoning = Array.isArray(decision.reasoning_steps);

    if (!validAction || !validConfidence || typeof decision.explanation !== 'string' || !validReasoning) {
      return fallback;
    }

    if (decision.action === 'OPEN_HEDGE') {
      const validDirection = decision.direction === 'UP' || decision.direction === 'DOWN';
      if (!validDirection || typeof decision.strike !== 'number' || typeof decision.size_dusdc !== 'number') {
        return fallback;
      }
    }

    const action = decision.action as AgentDecision['action'];
    const confidence = decision.confidence as number;

    return {
      action,
      direction: decision.direction ?? undefined,
      strike: decision.strike ?? undefined,
      size_dusdc: decision.size_dusdc ?? undefined,
      confidence,
      explanation: decision.explanation,
      reasoning_steps: decision.reasoning_steps as string[],
    };
  } catch {
    return fallback;
  }
}
