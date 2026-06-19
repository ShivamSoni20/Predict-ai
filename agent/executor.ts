import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });

// DeepBook Predict package ID (from predict-testnet-4-16 deployment)
const PREDICT_PACKAGE = process.env.NEXT_PUBLIC_PREDICT_PACKAGE!;
const PREDICT_SERVER = process.env.PREDICT_SERVER_URL!;

// ── Types ──
export interface OracleSVI {
  atm_iv: number;          // implied vol at the money (as decimal, e.g. 0.428)
  skew: number;            // risk-reversal skew
  slope: number;           // vol surface slope
  timestamp: number;       // unix ms
  expiry_ms: number;       // next expiry timestamp
  strike_atm: number;      // ATM strike price
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
}

// ── Oracle Functions ──

export async function checkPredictServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PREDICT_SERVER}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOracleSVI(): Promise<OracleSVI> {
  const predictId = process.env.PREDICT_OBJECT_ID!;
  const listRes = await fetch(`${PREDICT_SERVER}/predicts/${predictId}/oracles`);
  if (!listRes.ok) throw new Error('Failed to fetch oracle list');
  const oracles: any[] = await listRes.json();
  const activeOracle = oracles.find(o => o.status === 'active');
  if (!activeOracle) throw new Error('No active oracle found');

  const stateRes = await fetch(`${PREDICT_SERVER}/oracles/${activeOracle.oracle_id}/state`);
  if (!stateRes.ok) throw new Error('Failed to fetch oracle state');
  const data: any = await stateRes.json();

  return {
    atm_iv: data.atm_iv || 0.428,
    skew: data.skew || -0.05,
    slope: data.slope || 0.1,
    timestamp: data.timestamp || Date.now(),
    expiry_ms: data.expiry_ms || activeOracle.expiry,
    strike_atm: data.strike_atm || 103000,
  };
}

export async function fetchStrikeList(): Promise<Array<{
  strike: number;
  iv: number;
  premium_up: number;
  premium_down: number;
}>> {
  const predictId = process.env.PREDICT_OBJECT_ID!;
  const listRes = await fetch(`${PREDICT_SERVER}/predicts/${predictId}/oracles`);
  const oracles: any[] = await listRes.json();
  const activeOracle = oracles.find(o => o.status === 'active');
  
  if (activeOracle) {
    const stateRes = await fetch(`${PREDICT_SERVER}/oracles/${activeOracle.oracle_id}/state`);
    const data: any = await stateRes.json();
    if (data.strikes) return data.strikes;
  }
  
  // Fallback if not provided in state
  return [
    { strike: 101000, iv: 0.450, premium_up: 0.70, premium_down: 0.30 },
    { strike: 102000, iv: 0.435, premium_up: 0.60, premium_down: 0.40 },
    { strike: 103000, iv: 0.428, premium_up: 0.45, premium_down: 0.55 },
    { strike: 104000, iv: 0.430, premium_up: 0.35, premium_down: 0.65 },
    { strike: 105000, iv: 0.440, premium_up: 0.25, premium_down: 0.75 }
  ];
}

export async function fetchOpenPositions(
  managerAddress: string
): Promise<PredictPosition[]> {
  const response = await fetch(
    `${PREDICT_SERVER}/api/positions/${managerAddress}`
  );
  const data: any = await response.json();
  return data.positions;
}

// ── Transaction Functions ──

export async function buildMintTransaction(params: {
  mandateObjectId: string;
  predictManagerId: string;
  direction: 'UP' | 'DOWN';
  strike: number;
  sizeDusdc: number;
  dUsdcCoinObjectId: string;
  keypair: Ed25519Keypair;
  walrusCid: string;
}): Promise<string> {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(
    tx.object(params.dUsdcCoinObjectId),
    [params.sizeDusdc * 1_000_000]
  );

  const directionArg = params.direction === 'UP' ? 0 : 1;

  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::agent_mandate::check_and_record_spend`,
    arguments: [
      tx.object(params.mandateObjectId),
      tx.pure.u64(params.sizeDusdc * 1_000_000),
      tx.object('0x6'),
    ],
  });

  tx.moveCall({
    target: `${PREDICT_PACKAGE}::predict::mint`,
    arguments: [
      tx.object(params.predictManagerId),
      coin,
      tx.pure.u64(params.strike),
      tx.pure.u8(directionArg),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx as any,
    signer: params.keypair,
    options: { showEffects: true, showEvents: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
  }

  return result.digest;
}

export async function buildRedeemTransaction(params: {
  predictManagerId: string;
  positionId: string;
  keypair: Ed25519Keypair;
}): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PREDICT_PACKAGE}::predict::redeem_permissionless`,
    arguments: [
      tx.object(params.predictManagerId),
      tx.object(params.positionId),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx as any,
    signer: params.keypair,
    options: { showEffects: true },
  });

  return result.digest;
}

export async function createPredictManager(
  keypair: Ed25519Keypair
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PREDICT_PACKAGE}::predict::create_manager`,
    arguments: [],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx as any,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const managerObj = (result.objectChanges as any[])?.find(
    (c: any) => c.type === 'created' && c.objectType.includes('PredictManager')
  );

  return (managerObj as any)?.objectId ?? '';
}
