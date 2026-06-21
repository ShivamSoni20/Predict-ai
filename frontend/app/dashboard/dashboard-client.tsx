'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';

type AuditIndexEntry = {
  blobId: string;
  action: string;
  txDigest: string | null;
  timestamp: number;
  summary: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const account = useCurrentAccount();
  const dAppKit = useDAppKit();

  const loadData = () => {
    fetch('/api/agent')
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setError(null);
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleKillMandate() {
    setStatusMessage(null);
    if (!account) {
      setStatusMessage('Connect the owner wallet before using the emergency stop.');
      return;
    }

    const mandateId = process.env.NEXT_PUBLIC_MANDATE_OBJECT_ID;
    const killCapId = process.env.NEXT_PUBLIC_KILL_CAP_OBJECT_ID;
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

    if (!mandateId || !killCapId || !packageId) {
      setStatusMessage('Mandate object IDs are not configured. Check NEXT_PUBLIC_* env vars.');
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::agent_mandate::kill_mandate`,
      arguments: [tx.object(mandateId), tx.object(killCapId)],
    });

    setKilling(true);
    dAppKit.signAndExecuteTransaction({ transaction: tx as any })
      .then((result) => {
        if (result.FailedTransaction) {
          throw new Error(result.FailedTransaction.status.error?.message ?? 'Transaction failed');
        }
        setStatusMessage(`Agent mandate killed. Digest: ${result.Transaction.digest}`);
        loadData();
      })
      .catch((err: Error) => {
        setStatusMessage(`Kill transaction failed: ${err.message}`);
      })
      .finally(() => setKilling(false));
  }

  async function openAudit(entry: AuditIndexEntry) {
    setAuditLoading(true);
    setSelectedAudit(null);
    try {
      const res = await fetch(`/api/walrus?id=${encodeURIComponent(entry.blobId)}`);
      setSelectedAudit(await res.json());
    } catch (err) {
      setSelectedAudit({ error: String(err) });
    } finally {
      setAuditLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  const openPositions = data?.positions?.filter((p: any) => p.status === 'OPEN') ?? [];
  const closedPositions = data?.positions?.filter((p: any) => p.status === 'EXPIRED' || p.status === 'SETTLED') ?? [];
  const totalSpent = data?.mandate?.spent ?? data?.positions?.reduce((sum: number, p: any) => sum + p.size_dusdc, 0) ?? 0;
  const totalPnl = data?.positions?.reduce((sum: number, p: any) => sum + p.pnl, 0) ?? 0;

  return (
    <div id="dashboard" style={{ display: 'block' }}>
      <div className="db-wrap">
        <aside className="sb">
          <div className="sb-head">
            <div className="sb-mark">P</div>
            <span className="sb-name">PREDICTAI</span>
          </div>
          <nav className="sb-nav" aria-label="Dashboard">
            <div className="sb-grp">Overview</div>
            <Link className="sb-link on" href="/dashboard">Terminal</Link>
            <Link className="sb-link" href="/">Landing</Link>
            <div className="sb-grp">Control</div>
            <button className="sb-link sb-button-danger" type="button" onClick={handleKillMandate} disabled={killing}>
              {killing ? 'Stopping...' : 'Emergency Stop'}
            </button>
          </nav>
          <div className="sb-foot" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '15px' }}>
            <ConnectButton />
            {account && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div className="sb-av">{account.address.slice(2, 4).toUpperCase()}</div>
                <div>
                  <div style={{fontSize:'11px',fontFamily:'var(--mono)',color:'var(--text)'}}>Active Wallet</div>
                  <div className="sb-addr">{account.address.slice(0, 6)}...{account.address.slice(-4)}</div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="db-main">
          <div className="db-topbar">
            <div>
              <div className="db-title">DEEPBOOK PREDICT AGENT TERMINAL</div>
              <div className="db-sub">
                {openPositions.length} ACTIVE POSITIONS | BUDGET {totalSpent}/{data?.mandate?.budget_cap ?? process.env.NEXT_PUBLIC_AGENT_BUDGET_CAP ?? 500} dUSDC |{' '}
                <span style={{color: error ? 'var(--red)' : 'var(--green)'}}>{error ? 'SYSTEMS IMPAIRED' : 'LIVE TESTNET MODE'}</span>
              </div>
            </div>
            <div className="db-btns">
              <button className="dbtn dbtn-ghost" type="button" onClick={loadData}>Refresh</button>
              <button className="dbtn dbtn-gold" type="button" onClick={handleKillMandate} disabled={killing} aria-busy={killing}>
                {killing ? 'Killing...' : 'Kill Mandate'}
              </button>
            </div>
          </div>

          {error && <StatusBanner tone="error" text={error} />}
          {statusMessage && <StatusBanner tone="info" text={statusMessage} />}

          <div className="metrics">
            <Metric label="Predict API" value={data?.health?.predict ? 'ONLINE' : 'DOWN'} tone={data?.health?.predict ? 'green' : 'red'} />
            <Metric label="Walrus" value={data?.health?.walrusAggregator || data?.health?.walrusPublisher ? 'ONLINE' : 'CHECK'} tone="gold" />
            <Metric label="Mandate" value={data?.mandate?.is_active ? 'ACTIVE' : 'INACTIVE'} tone={data?.mandate?.is_active ? 'green' : 'red'} />
            <Metric label="Current IV" value={data?.oracle?.atm_iv ? `${(data.oracle.atm_iv * 100).toFixed(1)}%` : '...'} tone="amber" />
          </div>

          <div className="bottom-grid" style={{ marginBottom: '12px' }}>
            <section className="db-card">
              <div className="dc-head"><span className="dc-title">Memory-Influenced Reasoning</span></div>
              <div className="agent-log">
                <div className="ag-row">
                  <div className="ag-step">Memory Signal</div>
                  <div className="ag-text">{data?.memorySignal ?? 'Waiting for the first agent audit.'}</div>
                </div>
                <div className="ag-row">
                  <div className="ag-step">Mandate State</div>
                  <div className="ag-text">
                    Remaining budget: <span className="hl">{data?.mandate?.budget_remaining ?? 'unknown'} dUSDC</span>. Agent authorization is checked on-chain before every decision.
                  </div>
                </div>
              </div>
            </section>

            <section className="db-card">
              <div className="dc-head"><span className="dc-title">Walrus Audit Trail</span></div>
              <div className="audit-list">
                {(data?.auditIndex ?? []).length === 0 && (
                  <p style={{color: 'var(--text2)', padding: '20px', textAlign: 'center', fontFamily: 'var(--mono)'}}>No audit blobs indexed yet. Start the agent to write the first proof.</p>
                )}
                {(data?.auditIndex ?? []).map((entry: AuditIndexEntry) => (
                  <button key={entry.blobId} className="al-row audit-button" type="button" onClick={() => openAudit(entry)}>
                    <div className="al-icon ai-hedge">{entry.action.slice(0, 1)}</div>
                    <div className="al-body">
                      <div className="al-title">{entry.action}</div>
                      <div className="al-desc">{entry.summary}</div>
                      <div className="al-meta"><span className="al-time">{new Date(entry.timestamp).toLocaleTimeString()}</span><span className="al-cid">{entry.blobId.slice(0, 18)}...</span></div>
                    </div>
                  </button>
                ))}
              </div>
              {auditLoading && <p className="ag-text" style={{ marginTop: '12px' }}>Fetching Walrus blob...</p>}
              {selectedAudit && (
                <pre className="audit-preview">{JSON.stringify(selectedAudit, null, 2)}</pre>
              )}
            </section>
          </div>

          <div className="db-grid">
            <section className="db-card">
              <div className="dc-head">
                <span className="dc-title">Live Vol Surface | OracleSVI</span>
                <span className="dc-badge">LIVE</span>
              </div>
              <table className="strike-table">
                <thead>
                  <tr>
                    <th>Strike</th>
                    <th>Implied Vol</th>
                    <th>UP Prem</th>
                    <th>DN Prem</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.strikes ?? []).map((s: any) => (
                    <tr key={s.strike} className={s.strike === data?.oracle?.strike_atm ? 'atm' : ''}>
                      <td>${s.strike.toLocaleString()}</td>
                      <td>{(s.iv * 100).toFixed(1)}%</td>
                      <td>{s.premium_up.toFixed(3)}</td>
                      <td>{s.premium_down.toFixed(3)}</td>
                      <td><span className={`pill-sm ${s.premium_up < 0.5 ? 'pill-up' : 'pill-dn'}`}>{s.premium_up < 0.5 ? 'BUY UP' : 'BUY DN'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <div className="pos-list">
                <div className="dc-head" style={{marginBottom:'10px'}}><span className="dc-title">Active Positions ({openPositions.length})</span></div>
                {openPositions.length === 0 && (
                  <p style={{color: 'var(--text2)', padding: '20px', textAlign: 'center', fontFamily: 'var(--mono)'}}>No active positions. The agent will mint only when confidence clears the threshold.</p>
                )}
                {openPositions.map((p: any) => (
                  <PositionCard key={p.position_id} position={p} />
                ))}
              </div>
            </section>
          </div>

          <section className="db-card" style={{ marginTop: '12px' }}>
            <div className="dc-head"><span className="dc-title">Settled Positions ({closedPositions.length})</span></div>
            {closedPositions.length === 0 ? (
              <p style={{color: 'var(--text2)', padding: '20px', textAlign: 'center', fontFamily: 'var(--mono)'}}>No settled positions yet.</p>
            ) : closedPositions.map((p: any) => (
              <div key={p.position_id} className="al-row">
                <div className="al-icon ai-close">S</div>
                <div className="al-body">
                  <div className="al-title">BTC {p.direction} @ ${p.strike.toLocaleString()}</div>
                  <div className="al-desc">{p.status}</div>
                </div>
                <div className="al-amount" style={{color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)'}}>
                  {p.pnl >= 0 ? `+${p.pnl.toFixed(2)}` : p.pnl.toFixed(2)} dUSDC
                </div>
              </div>
            ))}
            <div style={{ marginTop: '12px', color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
              Total PnL: {totalPnl >= 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2)} dUSDC
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'gold' | 'amber' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--gold)';
  return (
    <div className="mc mc-gold">
      <div className="mc-lbl">{label}</div>
      <div className="mc-val" style={{ color }}>{value}</div>
    </div>
  );
}

function PositionCard({ position }: { position: any }) {
  return (
    <div className={`pos-card ${position.direction === 'UP' ? 'pos-up' : 'pos-dn'}`}>
      <div className="pos-head">
        <span className="pos-name">BTC {position.direction}</span>
        <span className={`pos-dir ${position.direction === 'UP' ? 'pd-up' : 'pd-dn'}`}>${position.strike.toLocaleString()}</span>
      </div>
      <div className="pos-details">
        <div className="pd-item"><span className="pd-label">Size</span><span className="pd-val">{position.size_dusdc} dUSDC</span></div>
        <div className="pd-item"><span className="pd-label">Entry</span><span className="pd-val">{position.entry_premium.toFixed(3)}</span></div>
        <div className="pd-item"><span className="pd-label">Expiry</span><span className="pd-val">{new Date(position.expiry_ms).toLocaleTimeString()}</span></div>
      </div>
    </div>
  );
}

function StatusBanner({ tone, text }: { tone: 'error' | 'info'; text: string }) {
  return (
    <div className="error-banner" style={{ padding: '12px', background: tone === 'error' ? '#7f1d1d' : '#1f2937', color: 'white', borderRadius: '4px', marginBottom: '16px', fontFamily: 'var(--mono)', fontSize: '12px' }}>
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div id="dashboard" style={{ display: 'block', padding: '100px 40px', textAlign: 'center', background: '#0a0a0c', minHeight: '100vh' }}>
      <p style={{ color: '#c9a84c', fontFamily: 'monospace', fontSize: '16px' }}>
        LOADING LIVE DEEPBOOK PREDICT DATA FROM INDEXER...
      </p>
    </div>
  );
}
