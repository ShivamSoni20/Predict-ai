'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);

  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  useEffect(() => {
    let mounted = true;
    const poll = () => {
      fetch('/api/agent')
        .then(res => res.json())
        .then(d => {
          if (!mounted) return;
          if (d.error) {
            setError(d.error);
          } else {
            setData(d);
            setError(null);
          }
          setLoading(false);
        })
        .catch(err => {
          if (!mounted) return;
          setError(String(err));
          setLoading(false);
        });
    };
    poll();
    const interval = setInterval(poll, 15000); // refresh every 15s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  function handleKillMandate() {
    if (!account) {
      alert('Connect your wallet first — only the mandate owner can kill the agent.');
      return;
    }

    const mandateId = process.env.NEXT_PUBLIC_MANDATE_OBJECT_ID;
    const killCapId = process.env.NEXT_PUBLIC_KILL_CAP_OBJECT_ID;
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

    if (!mandateId || !killCapId || !packageId) {
      alert('Mandate object IDs not configured. Check NEXT_PUBLIC_ env vars.');
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::agent_mandate::kill_mandate`,
      arguments: [tx.object(mandateId), tx.object(killCapId)],
    });

    setKilling(true);
    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: (result) => {
          setKilling(false);
          alert(`Agent killed successfully! Transaction Digest: ${result.digest}`);
        },
        onError: (err) => {
          setKilling(false);
          alert(`Failed to kill agent: ${err.message}`);
        },
      }
    );
  }

  if (loading) return <DashboardSkeleton />;

  const openPositions = data?.positions?.filter((p: any) => p.status === 'OPEN') ?? [];
  const closedPositions = data?.positions?.filter((p: any) => p.status === 'EXPIRED' || p.status === 'SETTLED') ?? [];

  const totalSpent = data?.positions?.reduce((sum: number, p: any) => sum + p.size_dusdc, 0) ?? 0;
  const totalPnl = data?.positions?.reduce((sum: number, p: any) => sum + p.pnl, 0) ?? 0;

  return (
    <div id="dashboard" style={{ display: 'block' }}>
      <div className="db-wrap">
        <aside className="sb">
          <div className="sb-head">
            <div className="sb-mark">P</div>
            <span className="sb-name">PREDICTAI</span>
          </div>
          <nav className="sb-nav">
            <div className="sb-grp">Overview</div>
            <div className="sb-link on">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Terminal
              <span className="sb-dot"></span>
            </div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Vol Surface
            </div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Positions
              <span className="sb-badge">{openPositions.length}</span>
            </div>
            <div className="sb-grp">Data</div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Agent Reasoning
            </div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
              Walrus Audit
            </div>
            <div className="sb-grp">Control</div>
            <div className="sb-link" style={{color:'var(--red)', cursor: 'pointer'}} onClick={handleKillMandate}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
              {killing ? 'Stopping...' : 'Emergency Stop'}
            </div>
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
          {error && <div className="error-banner" style={{ padding: '12px', background: '#c0392b', color: 'white', borderRadius: '4px', marginBottom: '16px', fontFamily: 'var(--mono)', fontSize: '12px' }}>⚠ {error}</div>}

          <div className="db-topbar">
            <div>
              <div className="db-title">AGENT TERMINAL</div>
              <div className="db-sub">{openPositions.length} ACTIVE POSITIONS · BUDGET {totalSpent}/{process.env.NEXT_PUBLIC_AGENT_BUDGET_CAP || 500} dUSDC · <span style={{color: error ? 'var(--red)' : 'var(--green)'}}>{error ? 'SYSTEMS IMPAIRED' : 'ALL SYSTEMS NOMINAL'}</span></div>
            </div>
            <div className="db-btns">
              <Link href="/" className="dbtn dbtn-ghost">← Landing</Link>
              <button 
                className="dbtn dbtn-gold" 
                style={{ backgroundColor: '#c0392b', color: 'white', borderColor: '#c0392b' }} 
                onClick={handleKillMandate} 
                disabled={killing}
              >
                {killing ? 'Killing Agent...' : '⚠ Kill Agent Mandate'}
              </button>
            </div>
          </div>

          <div className="metrics">
            <div className="mc mc-g">
              <div className="mc-lbl">Total P&L</div>
              <div className="mc-val" style={{color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}} id="totalPnl">{totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}</div>
              <div className="mc-change" style={{color:'var(--green)'}}>Based on indexed outcomes</div>
            </div>
            <div className="mc mc-gold">
              <div className="mc-lbl">Budget Used</div>
              <div className="mc-val">{totalSpent} <span style={{fontSize:'12px',color:'var(--text2)'}}>dUSDC</span></div>
              <div className="mc-change" style={{color:'var(--text3)'}}>{Math.max(0, (Number(process.env.NEXT_PUBLIC_AGENT_BUDGET_CAP || 500) - totalSpent))} remaining of cap</div>
            </div>
            <div className="mc mc-a">
              <div className="mc-lbl">Current IV (ATM)</div>
              <div className="mc-val" style={{color:'var(--amber)'}} id="ivDisplay">{data?.oracle?.atm_iv ? (data.oracle.atm_iv * 100).toFixed(1) + '%' : '...'}</div>
              <div className="mc-change" style={{color:'var(--amber)'}}>ATM Strike: ${data?.oracle?.strike_atm?.toLocaleString() ?? '...'}</div>
            </div>
            <div className="mc mc-r">
              <div className="mc-lbl">Status</div>
              <div className="mc-val" style={{color: error ? 'var(--red)' : 'var(--green)'}}>{error ? 'ERROR' : 'ACTIVE'}</div>
              <div className="mc-change" style={{color:'var(--text3)'}}>Agent running cycles</div>
            </div>
          </div>

          <div className="expiry-bar">
            <div>
              <div className="exp-label">Active Oracle Expiry</div>
              <div className="exp-time" id="expTime">
                {data?.oracle?.expiry_ms ? new Date(data.oracle.expiry_ms).toISOString() : '...'}
              </div>
            </div>
            <div className="exp-bar-wrap">
              <div className="exp-bar-fill"></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="exp-label">Oracle ATM Strike</div>
              <div style={{fontSize:'14px',fontFamily:'var(--mono)',color:'var(--text)'}}>${data?.oracle?.strike_atm?.toLocaleString() ?? '...'}</div>
            </div>
          </div>

          <div className="db-grid">
            <div>
              <div className="db-card" style={{marginBottom:'12px'}}>
                <div className="dc-head">
                  <span className="dc-title">LIVE VOL SURFACE · OracleSVI</span>
                  <span className="dc-badge">● LIVE</span>
                </div>
                <div className="vol-large">
                  <div className="vl-grid-h" style={{top:'25%'}}></div>
                  <div className="vl-grid-h" style={{top:'50%'}}></div>
                  <div className="vl-grid-h" style={{top:'75%'}}></div>
                  <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 600 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="surfGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,140 Q100,115 200,90 Q280,72 300,68 Q320,66 400,78 Q480,96 600,130 L600,160 L0,160 Z" fill="url(#surfGrad2)"/>
                    <path d="M0,140 Q100,115 200,90 Q280,72 300,68 Q320,66 400,78 Q480,96 600,130" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.7"/>
                    <line x1="300" y1="0" x2="300" y2="160" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="4,4" />
                    <circle cx="300" cy="68" r="4" fill="#c9a84c" />
                    <text x="308" y="62" fontSize="9" fill="#c9a84c" fontFamily="monospace" opacity="0.9">ATM {(data?.oracle?.atm_iv * 100).toFixed(1)}%</text>
                  </svg>
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
              </div>
            </div>
            <div>
              <div className="pos-list">
                <div className="dc-head" style={{marginBottom:'10px'}}><span className="dc-title">ACTIVE POSITIONS ({openPositions.length})</span></div>
                {openPositions.length === 0 && (
                  <p style={{color: 'var(--text2)', padding: '20px', textAlign: 'center', fontFamily: 'var(--mono)'}}>No active open positions</p>
                )}
                {openPositions.map((p: any) => (
                   <div key={p.position_id} className={`pos-card ${p.direction === 'UP' ? 'pos-up' : 'pos-dn'}`}>
                     <div className="pos-head">
                       <span className="pos-name">BTC {p.direction}</span>
                       <span className={`pos-dir ${p.direction === 'UP' ? 'pd-up' : 'pd-dn'}`}>${p.strike.toLocaleString()}</span>
                     </div>
                     <div className="pos-details">
                       <div className="pd-item"><span className="pd-label">Size</span><span className="pd-val">{p.size_dusdc} dUSDC</span></div>
                       <div className="pd-item"><span className="pd-label">Entry</span><span className="pd-val">{p.entry_premium.toFixed(3)}</span></div>
                       <div className="pd-item"><span className="pd-label">Expiry</span><span className="pd-val">{new Date(p.expiry_ms).toLocaleTimeString()}</span></div>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="db-card">
              <div className="dc-head"><span className="dc-title">WALRUS AUDIT FEED (HISTORICAL POSITIONS)</span></div>
              <div className="audit-list">
                {closedPositions.length === 0 && (
                  <p style={{color: 'var(--text2)', padding: '20px', textAlign: 'center', fontFamily: 'var(--mono)'}}>No settled positions</p>
                )}
                {closedPositions.map((p: any) => (
                  <div key={p.position_id} className="al-row">
                    <div className="al-icon ai-close">S</div>
                    <div className="al-body">
                      <div className="al-title">Position Settled</div>
                      <div className="al-desc">BTC {p.direction} @ ${p.strike.toLocaleString()} ({p.status})</div>
                      <div className="al-meta"><span className="al-time">{new Date(p.expiry_ms).toLocaleTimeString()}</span><span className="al-cid">PID: {p.position_id.slice(0, 12)}...</span></div>
                    </div>
                    <div className="al-amount" style={{color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)'}}>
                      {p.pnl >= 0 ? `+${p.pnl.toFixed(2)}` : `${p.pnl.toFixed(2)}`} dUSDC
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="db-card">
              <div className="dc-head"><span className="dc-title">AGENT REASONING</span></div>
              <div className="agent-log">
                <div className="ag-row">
                  <div className="ag-step">Market Scan</div>
                  <div className="ag-text">Current ATM Implied Volatility is <span className="hl">{(data?.oracle?.atm_iv * 100).toFixed(1)}%</span>. Skew is <span className="hl">{data?.oracle?.skew?.toFixed(3) ?? '...'}</span>.</div>
                </div>
                <div className="ag-row">
                  <div className="ag-step">Hedge Decisions</div>
                  <div className="ag-text">Agent analyzing optimal strikes for volatility hedging. Budget limit is {totalSpent}/{process.env.NEXT_PUBLIC_AGENT_BUDGET_CAP || 500} dUSDC.</div>
                </div>
                <div className="ag-row">
                  <div className="ag-step">Control Mandate</div>
                  <div className="ag-text">Emergency stop is linked to mandate owner's wallet on-chain via KillCap `NEXT_PUBLIC_KILL_CAP_OBJECT_ID`.</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
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
