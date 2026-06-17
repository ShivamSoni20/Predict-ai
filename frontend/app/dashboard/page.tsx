'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/agent')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error);
  }, []);

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
              <span className="sb-badge">3</span>
            </div>
            <div className="sb-grp">Data</div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Agent Reasoning
              <span className="sb-badge">12</span>
            </div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
              Walrus Audit
            </div>
            <div className="sb-grp">Control</div>
            <div className="sb-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Budget Mandate
            </div>
            <div className="sb-link" style={{color:'var(--red)'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
              Emergency Stop
            </div>
          </nav>
          <div className="sb-foot">
            <div className="sb-av">SS</div>
            <div>
              <div style={{fontSize:'11px',fontFamily:'var(--mono)',color:'var(--text)'}}>Shivam Soni</div>
              <div className="sb-addr">0x7c2f...d8a1</div>
            </div>
          </div>
        </aside>

        <main className="db-main">
          <div className="db-topbar">
            <div>
              <div className="db-title">AGENT TERMINAL</div>
              <div className="db-sub">3 ACTIVE POSITIONS · BUDGET 172/500 dUSDC · LAST ORACLE: 47s ago · <span style={{color:'var(--green)'}}>ALL SYSTEMS NOMINAL</span></div>
            </div>
            <div className="db-btns">
              <Link href="/" className="dbtn dbtn-ghost">← Landing</Link>
              <button className="dbtn dbtn-ghost">New Mandate</button>
              <button className="dbtn dbtn-gold">+ Open Hedge</button>
            </div>
          </div>

          <div className="metrics">
            <div className="mc mc-g">
              <div className="mc-lbl">Total P&L</div>
              <div className="mc-val" style={{color:'var(--green)'}} id="totalPnl">+$247.80</div>
              <div className="mc-change" style={{color:'var(--green)'}}>↑ +$18.40 this session</div>
            </div>
            <div className="mc mc-gold">
              <div className="mc-lbl">Budget Used</div>
              <div className="mc-val">172 <span style={{fontSize:'12px',color:'var(--text2)'}}>dUSDC</span></div>
              <div className="mc-change" style={{color:'var(--text3)'}}>328 remaining of 500 cap</div>
            </div>
            <div className="mc mc-a">
              <div className="mc-lbl">Current IV (ATM)</div>
              <div className="mc-val" style={{color:'var(--amber)'}} id="ivDisplay">{data?.oracle?.atm_iv ? (data.oracle.atm_iv * 100).toFixed(1) + '%' : '...'}</div>
              <div className="mc-change" style={{color:'var(--amber)'}}>↑ ELEVATED · agent active</div>
            </div>
            <div className="mc mc-r">
              <div className="mc-lbl">Win Rate</div>
              <div className="mc-val">73.2%</div>
              <div className="mc-change" style={{color:'var(--text3)'}}>11 of 15 positions profitable</div>
            </div>
          </div>

          <div className="expiry-bar">
            <div>
              <div className="exp-label">Next Expiry</div>
              <div className="exp-time" id="expTime">00:47:23</div>
            </div>
            <div className="exp-bar-wrap">
              <div className="exp-bar-fill"></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="exp-label">Strike</div>
              <div style={{fontSize:'14px',fontFamily:'var(--mono)',color:'var(--text)'}}>$103,000</div>
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
                    <text x="308" y="62" fontSize="9" fill="#c9a84c" fontFamily="monospace" opacity="0.9">ATM 42.8%</text>
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
                    {data?.strikes?.map((s: any) => (
                      <tr key={s.strike} className={s.strike === 103000 ? 'atm' : ''}>
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
                {data?.positions?.map((p: any) => (
                   <div key={p.position_id} className={`pos-card ${p.status === 'OPEN' ? (p.direction === 'UP' ? 'pos-up' : 'pos-dn') : 'pos-closed'}`}>
                     <div className="pos-head">
                       <span className="pos-name">BTC {p.direction}</span>
                       <span className={`pos-dir ${p.direction === 'UP' ? 'pd-up' : 'pd-dn'}`}>${p.strike.toLocaleString()}</span>
                     </div>
                     <div className="pos-details">
                       <div className="pd-item"><span className="pd-label">Size</span><span className="pd-val">{p.size_dusdc} dUSDC</span></div>
                       <div className="pd-item"><span className="pd-label">Entry</span><span className="pd-val">{p.entry_premium.toFixed(3)}</span></div>
                       <div className="pd-item"><span className="pd-label">P&L</span><span className={`pd-val ${p.pnl > 0 ? 'pos' : (p.pnl < 0 ? 'neg' : '')}`}>{p.pnl > 0 ? `+${p.pnl}` : p.pnl} dUSDC</span></div>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="db-card">
              <div className="dc-head"><span className="dc-title">WALRUS AUDIT FEED</span></div>
              <div className="audit-list">
                <div className="al-row">
                  <div className="al-icon ai-hedge">H</div>
                  <div className="al-body">
                    <div className="al-title">Agent Opened Position</div>
                    <div className="al-desc">BTC UP @ 103K strike</div>
                    <div className="al-meta"><span className="al-time">14:23:07</span><span className="al-cid">CID: bafkrei...7xz9</span></div>
                  </div>
                  <div className="al-amount" style={{color:'var(--text)'}}>50.00 dUSDC</div>
                </div>
                <div className="al-row">
                  <div className="al-icon ai-close">S</div>
                  <div className="al-body">
                    <div className="al-title">Position Settled</div>
                    <div className="al-desc">predict::redeem_permissionless</div>
                    <div className="al-meta"><span className="al-time">12:11:42</span><span className="al-cid">CID: bafkrei...9k1c</span></div>
                  </div>
                  <div className="al-amount" style={{color:'var(--green)'}}>+18.40 dUSDC</div>
                </div>
              </div>
            </div>
            <div className="db-card">
              <div className="dc-head"><span className="dc-title">AGENT REASONING</span></div>
              <div className="agent-log">
                <div className="ag-row">
                  <div className="ag-step">STEP 1: Market Scan</div>
                  <div className="ag-text">Oracle SVI updated. ATM IV spiked to <span className="hl">42.8%</span> with negative skew.</div>
                </div>
                <div className="ag-row">
                  <div className="ag-step">STEP 2: Memory Recall</div>
                  <div className="ag-text">Retrieved past 5 similar setups from Walrus. Win rate historically <span className="hl">68%</span> on UP hedges here.</div>
                </div>
                <div className="ag-row">
                  <div className="ag-step">STEP 3: Decision</div>
                  <div className="ag-text">Confidence threshold met (0.72 > 0.65). Mandate check passed. Firing predict::mint.</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
