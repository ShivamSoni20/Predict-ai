import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

async function main() {
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' });
  const packageId = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
  
  try {
    const pkg: any = await client.getNormalizedMoveModule({ package: packageId, module: 'predict_manager' });
    console.log('Structs in predict_manager module:', Object.keys(pkg.structs));
    for (const structName of Object.keys(pkg.structs)) {
      console.log(`\nStruct: ${structName} fields:`);
      console.log(JSON.stringify(pkg.structs[structName].fields, null, 2));
    }
  } catch (error) {
    console.error('Error inspecting predict_manager module:', error);
  }
}

main();
