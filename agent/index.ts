import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  buildMintTransaction,
  buildRedeemTransaction,
  checkPredictServerHealth,
  fetchMandateState,
  fetchOpenPositions,
  fetchOracleSVI,
  fetchStrikeList,
} from './executor.js';
import { makeDecision } from './decision.js';
import { buildMemorySignal, recordOutcome, storeReasoning, verifyMemWalSetup } from './memory.js';
import { checkWalrusHealth, uploadAuditLog } from './logger.js';

const keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY!);
const AGENT_ADDRESS = keypair.getPublicKey().toSuiAddress();
const MANDATE_ID = process.env.MANDATE_OBJECT_ID!;
const MANAGER_ID = process.env.PREDICT_MANAGER_ID!;

async function runAgentCycle(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Agent cycle starting...`);

  try {
    const oracle = await fetchOracleSVI();
    const strikes = await fetchStrikeList();
    const openPositions = await fetchOpenPositions(AGENT_ADDRESS);
    const mandate = await fetchMandateState(MANDATE_ID);
    const memorySignal = await buildMemorySignal({
      atm_iv: oracle.atm_iv,
      skew: oracle.skew,
    });

    console.log(`Oracle ATM IV: ${(oracle.atm_iv * 100).toFixed(1)}%`);
    console.log(`Mandate: ${mandate.is_active ? 'active' : 'inactive'} | Budget remaining: ${mandate.budget_remaining} dUSDC`);
    console.log(`Memory signal: ${memorySignal.summary}`);

    const mandateBlockReason = getMandateBlockReason(mandate);
    if (mandateBlockReason) {
      console.warn(`Skipping cycle: ${mandateBlockReason}`);
      await uploadAuditLog({
        action: 'SKIP',
        txDigest: null,
        reasoningCid: null,
        decision: { action: 'SKIP', confidence: 0, explanation: mandateBlockReason },
        oracle,
        mandate,
        memorySignal,
      });
      return;
    }

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
      await uploadAuditLog({
        action: 'REDEEM',
        txDigest: digest,
        reasoningCid: null,
        decision: { action: 'REDEEM', explanation: `Redeemed ${pos.position_id}`, confidence: 1 },
        oracle,
        mandate,
        memorySignal,
      });
      console.log(`Redeemed: ${digest}`);
    }

    const openCount = openPositions.filter(p => p.status === 'OPEN').length;
    if (openCount >= 3) {
      console.log('Max positions open (3). Skipping.');
      await uploadAuditLog({
        action: 'SKIP',
        txDigest: null,
        reasoningCid: null,
        decision: { action: 'SKIP', confidence: 0, explanation: 'Max positions open (3).' },
        oracle,
        mandate,
        memorySignal,
      });
      return;
    }

    const decision = await makeDecision({
      oracle,
      strikes,
      budget_remaining: mandate.budget_remaining,
      open_positions: openCount,
      memory_signal: memorySignal,
    });

    console.log(`Decision: ${decision.action} | Confidence: ${decision.confidence}`);

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
      memory_signal: memorySignal,
    });

    console.log(`Reasoning stored on Walrus: ${reasoningCid}`);

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
        sizeDusdc: decision.size_dusdc ?? Number(process.env.POSITION_SIZE ?? 50),
        dUsdcCoinObjectId: dUsdcObject,
        keypair,
        walrusCid: reasoningCid,
      });

      await uploadAuditLog({
        action: 'MINT',
        txDigest: digest,
        reasoningCid,
        decision,
        oracle,
        mandate,
        memorySignal,
      });

      console.log(`Position opened: ${digest}`);
      return;
    }

    await uploadAuditLog({
      action: decision.action,
      txDigest: null,
      reasoningCid,
      decision,
      oracle,
      mandate,
      memorySignal,
    });
  } catch (error) {
    console.error('Agent cycle error:', error);
    await uploadAuditLog({
      action: 'ERROR',
      txDigest: null,
      reasoningCid: null,
      decision: null,
      oracle: null,
      mandate: null,
      memorySignal: null,
      error: String(error),
    });
  }
}

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

function getMandateBlockReason(mandate: Awaited<ReturnType<typeof fetchMandateState>>): string | null {
  const positionSize = Number(process.env.POSITION_SIZE ?? 50);

  if (!mandate.is_active) return 'Mandate is inactive.';
  if (mandate.expiry_ms <= Date.now()) return 'Mandate has expired.';
  if (mandate.agent.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) {
    return `Mandate authorizes ${mandate.agent}, not this agent ${AGENT_ADDRESS}.`;
  }
  if (mandate.budget_remaining < positionSize) {
    return `Mandate budget ${mandate.budget_remaining} dUSDC is below position size ${positionSize} dUSDC.`;
  }

  return null;
}

async function main(): Promise<void> {
  console.log('PredictAI Agent starting...');
  console.log(`Agent address: ${AGENT_ADDRESS}`);
  console.log(`Poll interval: ${Number(process.env.POLL_INTERVAL_MS ?? 300000) / 1000}s`);

  const isPredictUp = await checkPredictServerHealth();
  const isMemWalOk = await verifyMemWalSetup();
  const isWalrusUp = await checkWalrusHealth();

  if (!isPredictUp) console.warn('Warning: Predict server might be unreachable.');
  if (!isMemWalOk) console.warn('Warning: MemWal credentials not fully set.');
  if (!isWalrusUp) console.warn('Warning: Walrus publisher might be down.');

  await runAgentCycle();

  setInterval(async () => {
    await runAgentCycle();
  }, Number(process.env.POLL_INTERVAL_MS ?? 300000));
}

main().catch(console.error);
