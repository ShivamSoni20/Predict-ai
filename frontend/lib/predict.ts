import { suiClient } from './sui';

const PREDICT_SERVER = process.env.PREDICT_SERVER_URL || 'https://predict-server.testnet.mystenlabs.com';
const PREDICT_OBJECT_ID = process.env.PREDICT_OBJECT_ID || '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
const PREDICT_PACKAGE = process.env.NEXT_PUBLIC_PREDICT_PACKAGE || '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';

export interface OracleSVI {
  atm_iv: number;
  skew: number;
  slope: number;
  timestamp: number;
  expiry_ms: number;
  strike_atm: number;
  oracle_id?: string;
}

export interface PredictPosition {
  position_id: string;
  direction: 'UP' | 'DOWN';
  strike: number;
  size_dusdc: number;
  entry_premium: number;
  expiry_ms: number;
  status: 'OPEN' | 'SETTLED' | 'EXPIRED';
  pnl: number;
  oracle_id?: string;
  quantity?: number;
}

export interface MandateState {
  id: string;
  owner: string;
  agent: string;
  budget_cap: number;
  spent: number;
  budget_remaining: number;
  expiry_ms: number;
  is_active: boolean;
  created_at: number;
}

export async function checkPredictServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PREDICT_SERVER}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOracleSVI(): Promise<OracleSVI> {
  const listRes = await fetch(`${PREDICT_SERVER}/predicts/${PREDICT_OBJECT_ID}/oracles`);
  if (!listRes.ok) throw new Error(`Failed to fetch oracle list: ${listRes.status}`);
  const oracles: any[] = await listRes.json();
  const activeOracle = oracles.find(o => o.status === 'active') ?? oracles[0];
  if (!activeOracle) throw new Error('No active oracle found');

  const stateRes = await fetch(`${PREDICT_SERVER}/oracles/${activeOracle.oracle_id}/state`);
  if (!stateRes.ok) throw new Error(`Failed to fetch oracle state: ${stateRes.status}`);
  const data: any = await stateRes.json();

  const spotAtm = data.latest_price ? Math.round(Number(data.latest_price.spot) / 1_000_000_000) : 63000;

  return {
    atm_iv: data.atm_iv || 0.428,
    skew: data.skew || -0.05,
    slope: data.slope || 0.1,
    timestamp: data.timestamp || Date.now(),
    expiry_ms: data.expiry_ms || activeOracle.expiry || 0,
    strike_atm: data.strike_atm || spotAtm,
    oracle_id: activeOracle.oracle_id,
  };
}

export async function fetchStrikeList(): Promise<Array<{
  strike: number; iv: number; premium_up: number; premium_down: number;
}>> {
  try {
    const listRes = await fetch(`${PREDICT_SERVER}/predicts/${PREDICT_OBJECT_ID}/oracles`);
    const oracles: any[] = await listRes.json();
    const activeOracle = oracles.find(o => o.status === 'active') ?? oracles[0];
    if (activeOracle) {
      const stateRes = await fetch(`${PREDICT_SERVER}/oracles/${activeOracle.oracle_id}/state`);
      const data: any = await stateRes.json();
      if (data.strikes) return data.strikes;

      if (data.latest_price) {
        const spot = Number(data.latest_price.spot) / 1_000_000_000;
        const spotAtm = Math.round(spot / 100) * 100;
        return [
          { strike: spotAtm - 200, iv: 0.450, premium_up: 0.70, premium_down: 0.30 },
          { strike: spotAtm - 100, iv: 0.435, premium_up: 0.60, premium_down: 0.40 },
          { strike: spotAtm,       iv: 0.428, premium_up: 0.45, premium_down: 0.55 },
          { strike: spotAtm + 100, iv: 0.430, premium_up: 0.35, premium_down: 0.65 },
          { strike: spotAtm + 200, iv: 0.440, premium_up: 0.25, premium_down: 0.75 }
        ];
      }
    }
  } catch (error) {
    console.error('Error fetching strike list:', error);
  }
  return [
    { strike: 62800, iv: 0.450, premium_up: 0.70, premium_down: 0.30 },
    { strike: 62900, iv: 0.435, premium_up: 0.60, premium_down: 0.40 },
    { strike: 63000, iv: 0.428, premium_up: 0.45, premium_down: 0.55 },
    { strike: 63100, iv: 0.430, premium_up: 0.35, premium_down: 0.65 },
    { strike: 63200, iv: 0.440, premium_up: 0.25, premium_down: 0.75 }
  ];
}

export async function fetchOpenPositions(managerAddress: string): Promise<PredictPosition[]> {
  try {
    const res = await fetch(`${PREDICT_SERVER}/managers/${managerAddress}/positions`);
    if (res.ok) {
      const data = await res.json();
      const minted: any[] = data.minted ?? [];
      const redeemed: any[] = data.redeemed ?? [];

      return minted.map((m: any) => {
        const isRedeemed = redeemed.some(
          (r: any) =>
            r.oracle_id === m.oracle_id &&
            r.strike === m.strike &&
            r.is_up === m.is_up &&
            r.quantity === m.quantity
        );

        const status = isRedeemed
          ? 'EXPIRED'
          : m.expiry < Date.now()
          ? 'SETTLED'
          : 'OPEN';

        let pnl = 0;
        if (isRedeemed) {
          const matchingRedeem = redeemed.find(
            (r: any) =>
              r.oracle_id === m.oracle_id &&
              r.strike === m.strike &&
              r.is_up === m.is_up &&
              r.quantity === m.quantity
          );
          pnl = ((matchingRedeem?.payout ?? 0) - m.cost) / 1_000_000;
        }

        return {
          position_id: m.event_digest ?? m.digest ?? '',
          direction: m.is_up ? 'UP' : 'DOWN',
          strike: Number(m.strike) / 1_000_000_000,
          size_dusdc: m.cost / 1_000_000,
          entry_premium: m.ask_price / 1_000_000_000,
          expiry_ms: m.expiry,
          status,
          pnl,
          oracle_id: m.oracle_id,
          quantity: m.quantity,
        };
      });
    }
  } catch (err) {
    console.error('Indexer fetch failed, falling back to on-chain:', err);
  }

  try {
    const objects = await suiClient.getOwnedObjects({
      owner: managerAddress,
      filter: { StructType: `${PREDICT_PACKAGE}::predict::Position` },
      options: { showContent: true },
    });

    return objects.data.map((obj: any) => {
      const fields = obj.data?.content?.fields ?? {};
      return {
        position_id: obj.data?.objectId ?? '',
        direction: fields.direction === 0 ? 'UP' : 'DOWN',
        strike: Number(fields.strike ?? 0) / 1_000_000_000,
        size_dusdc: Number(fields.size ?? 0) / 1_000_000,
        entry_premium: Number(fields.entry_premium ?? 0) / 1_000_000_000,
        expiry_ms: Number(fields.expiry_ms ?? 0),
        status: fields.settled ? 'SETTLED' : 'OPEN',
        pnl: Number(fields.pnl ?? 0) / 1_000_000,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchMandateState(mandateObjectId: string): Promise<MandateState | null> {
  try {
    const object = await suiClient.getObject({
      id: mandateObjectId,
      options: { showContent: true },
    });

    const content = object.data?.content;
    if (!content || content.dataType !== 'moveObject') return null;

    const fields = (content as any).fields ?? {};
    const budgetCapMist = Number(fields.budget_cap ?? 0);
    const spentMist = Number(fields.spent ?? 0);
    const budgetCap = budgetCapMist / 1_000_000;
    const spent = spentMist / 1_000_000;

    return {
      id: mandateObjectId,
      owner: String(fields.owner ?? ''),
      agent: String(fields.agent ?? ''),
      budget_cap: budgetCap,
      spent,
      budget_remaining: Math.max(0, budgetCap - spent),
      expiry_ms: Number(fields.expiry_ms ?? 0),
      is_active: Boolean(fields.is_active),
      created_at: Number(fields.created_at ?? 0),
    };
  } catch {
    return null;
  }
}
