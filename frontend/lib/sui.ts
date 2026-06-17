import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
});

export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export { networkConfig };
