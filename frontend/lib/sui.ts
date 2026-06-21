import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

const GRPC_URL = 'https://fullnode.testnet.sui.io:443';

export const dAppKit = createDAppKit({
  networks: ['testnet'],
  defaultNetwork: 'testnet',
  createClient: (network) =>
    new SuiGrpcClient({
      network,
      baseUrl: GRPC_URL,
    }),
});

// JSON-RPC exposes the owned-object APIs used by the server-side fallback.
export const suiClient = new SuiJsonRpcClient({
  network: 'testnet',
  url: getJsonRpcFullnodeUrl('testnet'),
});
