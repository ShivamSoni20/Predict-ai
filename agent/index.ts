import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fetchOracleSVI, fetchStrikeList, fetchOpenPositions, buildMintTransaction, buildRedeemTransaction, checkPredictServerHealth } from './executor.js';
import { makeDecision } from './decision.js';
import { storeReasoning, recordOutcome, verifyMemWalSetup } from './memory.js';
import { uploadAuditLog, checkWalrusHealth } from './logger.js';

const keypair = Ed25519Keypair.fromSecretKey(
  process.env.SUI_PRIVATE_KEY!
);
const AGENT_ADDRESS = keypair.getPublicKey().toSuiAddress();
const MANDATE_ID = process.env.MANDATE_OBJECT_ID!;
const MANAGER_ID = process.env.PREDICT_MANAGER_ID!;

async function runAgentCycle(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Agent cycle starting...`);

  try {
    // Step 1: Fetch live oracle data
    const oracle = await fetchOracleSVI();
    const strikes = await fetchStrikeList();
    const openPositions = await fetchOpenPositions(AGENT_ADDRESS);

    console.log(`Oracle ATM IV: ${(oracle.atm_iv * 100).toFixed(1)}%`);

    // Step 2: Check for settled positions to redeem
    const settledPositions = openPositions.filter(p => p.status === 'SETTLED');
    for (const pos of settledPositions) {
      console.log(`Redeeming settled position: ${pos.position_id}`);
      const digest = await buildRedeemTransaction({
        predictManagerId: MANAGER_ID,
        position: pos,
        keypair,
      });
      await recordOutcome({
        direction: pos.direction,
        strike: pos.strike,
        iv_at_entry: oracle.atm_iv,
        outcome: pos.pnl > 0 ? 'WIN' : 'LOSS',
        pnl: pos.pnl,
      });
      console.log(`Redeemed: ${digest}`);
    }

    // Step 3: Check if we should open new position
    const openCount = openPositions.filter(p => p.status === 'OPEN').length;
    if (openCount >= 3) {
      console.log('Max positions open (3). Skipping.');
      return;
    }

    // Step 4: Agent makes decision
    const decision = await makeDecision({
      oracle,
      strikes,
      budget_remaining: Number(process.env.AGENT_BUDGET_CAP) - getTotalSpent(),
      open_positions: openCount,
    });

    console.log(`Decision: ${decision.action} | Confidence: ${decision.confidence}`);

    // Step 5: Store reasoning on Walrus BEFORE executing
    const reasoningCid = await storeReasoning({
      oracle: {
        atm_iv: oracle.atm_iv,
        skew: oracle.skew,
        timestamp: oracle.timestamp,
      },
      decision: decision.action,
      direction: decision.direction,
      strike: decision.strike,
      confidence: decision.confidence,
      explanation: decision.explanation,
    });

    console.log(`Reasoning stored on Walrus: ${reasoningCid}`);

    // Step 6: Execute if action is OPEN_HEDGE
    if (decision.action === 'OPEN_HEDGE' && decision.direction && decision.strike) {
      const dUsdcObject = await findDUsdcCoin(keypair);

      const selectedStrikeInfo = strikes.find(s => s.strike === decision.strike);
      const premium = decision.direction === 'UP' 
        ? (selectedStrikeInfo?.premium_up ?? 0.5) 
        : (selectedStrikeInfo?.premium_down ?? 0.5);

      const digest = await buildMintTransaction({
        mandateObjectId: MANDATE_ID,
        predictManagerId: MANAGER_ID,
        oracleId: oracle.oracle_id!,
        expiry: oracle.expiry_ms,
        direction: decision.direction,
        strike: decision.strike,
        premium,
        sizeDusdc: decision.size_dusdc ?? 50,
        dUsdcCoinObjectId: dUsdcObject,
        keypair,
        walrusCid: reasoningCid,
      });

      // Step 7: Log to Walrus audit trail
      await uploadAuditLog({
        action: 'MINT',
        txDigest: digest,
        reasoningCid,
        decision,
        oracle,
      });

      console.log(`Position opened: ${digest}`);
    } else {
      // Log the skip/hold decision too
      await uploadAuditLog({
        action: decision.action,
        txDigest: null,
        reasoningCid,
        decision,
        oracle,
      });
    }

  } catch (error) {
    console.error('Agent cycle error:', error);
    // Log error to Walrus for audit
    await uploadAuditLog({
      action: 'ERROR',
      txDigest: null,
      reasoningCid: null,
      decision: null,
      oracle: null,
      error: String(error),
    });
  }
}

// ── Helper: find dUSDC coin object ──
async function findDUsdcCoin(keypair: Ed25519Keypair): Promise<string> {
  const { SuiJsonRpcClient, getJsonRpcFullnodeUrl } = await import('@mysten/sui/jsonRpc');
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });

  const coins = await client.getCoins({
    owner: keypair.getPublicKey().toSuiAddress(),
    coinType: process.env.DUSDC_COIN_TYPE!,
  });

  if (!coins.data.length) throw new Error('No dUSDC coins found. Request from faucet.');
  return coins.data[0].coinObjectId;
}

let totalSpent = 0;
function getTotalSpent(): number { return totalSpent; }

// ── Main loop ──
async function main(): Promise<void> {
  console.log('PredictAI Agent starting...');
  console.log(`Agent address: ${AGENT_ADDRESS}`);
  console.log(`Budget cap: ${process.env.AGENT_BUDGET_CAP} dUSDC`);
  console.log(`Poll interval: ${Number(process.env.POLL_INTERVAL_MS) / 1000}s`);

  // Health checks
  const isPredictUp = await checkPredictServerHealth();
  const isMemWalOk = await verifyMemWalSetup();
  const isWalrusUp = await checkWalrusHealth();
  
  if (!isPredictUp) console.warn('Warning: Predict server might be unreachable.');
  if (!isMemWalOk) console.warn('Warning: MemWal credentials not fully set.');
  if (!isWalrusUp) console.warn('Warning: Walrus publisher might be down.');

  // Run immediately, then on interval
  await runAgentCycle();

  setInterval(async () => {
    await runAgentCycle();
  }, Number(process.env.POLL_INTERVAL_MS ?? 300000));
}

main().catch(console.error);
