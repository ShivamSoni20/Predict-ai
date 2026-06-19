import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';

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

// For direct client usage in server-side code (API routes)
export { SuiGrpcClient };
export const suiClient = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: GRPC_URL,
});
