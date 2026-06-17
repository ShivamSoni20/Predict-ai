import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

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

export async function fetchOracleSVI(): Promise<OracleSVI> {
  const response = await fetch(`${PREDICT_SERVER}/api/oracle/latest`);
  if (!response.ok) throw new Error('Failed to fetch oracle SVI');
  const data: any = await response.json();

  return {
    atm_iv: data.atm_iv,
    skew: data.skew,
    slope: data.slope,
    timestamp: data.timestamp,
    expiry_ms: data.expiry_ms,
    strike_atm: data.strike_atm,
  };
}

export async function fetchStrikeList(): Promise<Array<{
  strike: number;
  iv: number;
  premium_up: number;
  premium_down: number;
}>> {
  const response = await fetch(`${PREDICT_SERVER}/api/strikes/current`);
  const data: any = await response.json();
  return data.strikes;
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
    target: `${PREDICT_PACKAGE}::predict::mint`,
    arguments: [
      tx.object(params.predictManagerId),
      coin,
      tx.pure.u64(params.strike),
      tx.pure.u8(directionArg),
    ],
  });

  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::agent_mandate::check_and_record_spend`,
    arguments: [
      tx.object(params.mandateObjectId),
      tx.pure.u64(params.sizeDusdc * 1_000_000),
      tx.object('0x6'),
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

  const manager = tx.moveCall({
    target: `${PREDICT_PACKAGE}::predict::create_manager`,
    arguments: [],
  });

  tx.transferObjects([manager], keypair.getPublicKey().toSuiAddress());

  const result = await client.signAndExecuteTransaction({
    transaction: tx as any,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const managerObj = result.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType.includes('PredictManager')
  );

  return (managerObj as any)?.objectId ?? '';
}
