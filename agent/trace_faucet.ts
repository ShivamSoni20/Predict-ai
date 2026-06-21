import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

async function main() {
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });
  const packageId = '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a';

  try {
    console.log(`Querying transactions involving package ${packageId}...`);
    const txs = await client.queryTransactionBlocks({
      filter: {
        InputObject: packageId
      },
      limit: 10
    });

    console.log(`Found ${txs.data.length} transactions. Inspecting details...`);
    for (const tx of txs.data) {
      console.log(`\nTransaction: ${tx.digest}`);
      const txDetails = await client.getTransactionBlock({
        digest: tx.digest,
        options: { showInput: true, showEffects: true }
      });
      console.log('Sender:', txDetails.transaction?.data.sender);
      console.log('Transaction kind:', JSON.stringify(txDetails.transaction?.data.transaction, null, 2));
    }
  } catch (error) {
    console.error('Error tracing faucet:', error);
  }
}

main();
