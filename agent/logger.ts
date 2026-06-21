import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const PUBLISHER = process.env.WALRUS_PUBLISHER_URL!;
const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL!;
const AUDIT_INDEX_PATH = process.env.AUDIT_INDEX_PATH ?? '../frontend/data/audit-index.json';

export interface AuditEntry {
  action: 'MINT' | 'REDEEM' | 'HOLD' | 'SKIP' | 'ERROR' | 'OPEN_HEDGE';
  txDigest: string | null;
  reasoningCid: string | null;
  decision: any;
  oracle: any;
  mandate?: any;
  memorySignal?: any;
  error?: string;
  timestamp: number;
  agent_version: string;
}

export interface AuditIndexEntry {
  blobId: string;
  action: AuditEntry['action'];
  txDigest: string | null;
  timestamp: number;
  summary: string;
}

/**
 * Upload an audit log entry to Walrus
 * Returns the blob ID (CID) for display in dashboard
 */
export async function checkWalrusHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PUBLISHER}`);
    return res.status === 200 || res.status === 404; // 404 means it's up but we didn't specify path
  } catch {
    return false;
  }
}

export async function uploadAuditLog(params: Omit<AuditEntry, 'timestamp' | 'agent_version'>): Promise<string> {
  const entry: AuditEntry = {
    ...params,
    timestamp: Date.now(),
    agent_version: '1.0.0',
  };

  const blob = new TextEncoder().encode(JSON.stringify(entry, null, 2));

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await fetch(`${PUBLISHER}/v1/blobs?epochs=10`, {
        method: 'PUT',
        body: blob as any,
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data: any = await response.json();
        const blobId = data.newlyCreated?.blobObject?.blobId ?? data.alreadyCertified?.blobId ?? 'unknown';
        console.log(`Audit log stored on Walrus: ${blobId}`);
        await appendAuditIndex({
          blobId,
          action: entry.action,
          txDigest: entry.txDigest,
          timestamp: entry.timestamp,
          summary: buildAuditSummary(entry),
        });
        return blobId;
      }
    } catch (err) {
      console.warn(`Walrus upload attempt ${attempts + 1} failed:`, err);
    }
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  throw new Error(`Walrus upload failed after 3 attempts`);
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

async function appendAuditIndex(entry: AuditIndexEntry): Promise<void> {
  cacheAuditBlobId(entry.blobId);

  const fullPath = path.resolve(AUDIT_INDEX_PATH);
  await mkdir(path.dirname(fullPath), { recursive: true });

  let existing: AuditIndexEntry[] = [];
  try {
    existing = JSON.parse(await readFile(fullPath, 'utf8')) as AuditIndexEntry[];
  } catch {
    existing = [];
  }

  const next = [entry, ...existing.filter((item) => item.blobId !== entry.blobId)].slice(0, 50);
  await writeFile(fullPath, JSON.stringify(next, null, 2));
}

function buildAuditSummary(entry: AuditEntry): string {
  if (entry.error) return `Error: ${entry.error}`;
  if (entry.memorySignal?.summary) return String(entry.memorySignal.summary);
  if (entry.decision?.explanation) return String(entry.decision.explanation);
  if (entry.txDigest) return `${entry.action} transaction ${entry.txDigest.slice(0, 10)}...`;
  return `${entry.action} recorded`;
}
