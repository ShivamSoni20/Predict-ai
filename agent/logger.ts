const PUBLISHER = process.env.WALRUS_PUBLISHER_URL!;
const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL!;

export interface AuditEntry {
  action: 'MINT' | 'REDEEM' | 'HOLD' | 'SKIP' | 'ERROR';
  txDigest: string | null;
  reasoningCid: string | null;
  decision: any;
  oracle: any;
  error?: string;
  timestamp: number;
  agent_version: string;
}

/**
 * Upload an audit log entry to Walrus
 * Returns the blob ID (CID) for display in dashboard
 */
export async function uploadAuditLog(params: Omit<AuditEntry, 'timestamp' | 'agent_version'>): Promise<string> {
  const entry: AuditEntry = {
    ...params,
    timestamp: Date.now(),
    agent_version: '1.0.0',
  };

  const blob = new TextEncoder().encode(JSON.stringify(entry, null, 2));

  const response = await fetch(
    `${PUBLISHER}/v1/blobs?epochs=10`,
    {
      method: 'PUT',
      body: blob as any,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Walrus upload failed: ${response.statusText}`);
  }

  const data: any = await response.json();
  const blobId = data.newlyCreated?.blobObject?.blobId
    ?? data.alreadyCertified?.blobId
    ?? 'unknown';

  console.log(`Audit log stored on Walrus: ${blobId}`);
  return blobId;
}

/**
 * Read an audit log entry from Walrus by CID
 */
export async function readAuditLog(blobId: string): Promise<AuditEntry> {
  const response = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
  if (!response.ok) throw new Error(`Failed to read Walrus blob: ${blobId}`);
  const text = await response.text();
  return JSON.parse(text) as AuditEntry;
}

/**
 * List recent blob IDs from local cache
 * (In production: store IDs in a Sui on-chain list)
 */
const blobIdCache: string[] = [];
export function cacheAuditBlobId(id: string): void {
  blobIdCache.unshift(id);
  if (blobIdCache.length > 100) blobIdCache.pop();
}
export function getRecentBlobIds(): string[] {
  return blobIdCache.slice(0, 20);
}
