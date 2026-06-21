import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });
const keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY!);
const PREDICT_PACKAGE = process.env.NEXT_PUBLIC_PREDICT_PACKAGE!;

async function main() {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PREDICT_PACKAGE}::predict::create_manager`,
    arguments: [],
  });

  console.log("Sending transaction to create PredictManager...");
  const result = await client.signAndExecuteTransaction({
    transaction: tx as any,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const managerObj = (result.objectChanges as any[])?.find(
    (c: any) => c.type === 'created' && c.objectType.includes('PredictManager')
  );

  console.log("Result:", result.effects?.status);
  console.log("PredictManager Object ID:", managerObj?.objectId);
}

main().catch(console.error);
