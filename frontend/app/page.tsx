import Link from 'next/link';

export default function LandingPage() {
  return (
    <div id="landing">
      <nav>
        <Link href="/" className="logo">
          <div className="logo-mark">P</div>
          <span className="logo-text">PredictAI</span>
        </Link>
        <div className="nav-center">
          <div className="nav-ticker">
            <span className="sym">BTC/USD</span>
            <span className="price" id="btcPrice">$103,284</span>
            <span className="change" id="btcChange">+2.34%</span>
          </div>
          <div className="nav-ticker">
            <span className="sym">IV</span>
            <span className="price">42.8%</span>
            <span className="change">↑ HIGH</span>
          </div>
        </div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#tech">Technology</a>
          <a href="https://sui.io" target="_blank" rel="noreferrer">Sui Network</a>
        </div>
        <Link href="/dashboard" className="nav-btn">Open Terminal →</Link>
      </nav>

      <div className="hero">
        <div className="hero-grid"></div>
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>

        <div className="live-badge">
          <span className="live-dot"></span>
          LIVE ON SUI TESTNET · DEEPBOOK PREDICT
        </div>

        <p className="hero-eyebrow">Autonomous hedging · AI-powered · Verifiable</p>
        <h1 className="hero-title">Markets move.<br/><span className="gold">Agents hedge.</span></h1>
        <h2 className="hero-title-2">You sleep.</h2>
        <p className="hero-sub">
          PredictAI reads DeepBook's live volatility surface, stores its reasoning on Walrus, and autonomously opens binary hedge positions on your behalf — with a capped budget you control.
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn-primary">
            Open Terminal →
          </Link>
          <a href="#how" className="btn-ghost">See how it works</a>
        </div>
      </div>

      <div className="ticker-wrap" style={{ marginTop: 0 }}>
        <div className="ticker-track" id="tickerTrack">
          {Array(4).fill(0).map((_, idx) => (
            <span key={idx} style={{display: 'flex', gap: '40px'}}>
              <span className="t-item"><span className="sym">BTC-103K-CALL</span><span className="sep">·</span><span className="val">0.234 dUSDC</span><span className="sep">·</span><span className="up">+12.4%</span></span>
              <span className="t-item"><span className="sym">AGENT POSITION</span><span className="sep">·</span><span className="val">BTC UP · 72% confidence</span><span className="sep">·</span><span className="val">50 dUSDC</span></span>
              <span className="t-item"><span className="sym">WALRUS LOG</span><span className="sep">·</span><span className="val">bafkrei...7xz9</span><span className="sep">·</span><span className="up">✓ verified</span></span>
              <span className="t-item"><span className="sym">IV SURFACE</span><span className="sep">·</span><span className="val">SVI updated</span><span className="sep">·</span><span className="val">ATM: 42.8%</span><span className="sep">·</span><span className="up">↑ ELEVATED</span></span>
              <span className="t-item"><span className="sym">SETTLEMENT</span><span className="sep">·</span><span className="val">predict::redeem</span><span className="sep">·</span><span className="up">+$18.40 claimed</span></span>
              <span className="t-item"><span className="sym">DEEPBOOK PREDICT</span><span className="sep">·</span><span className="val">testnet-4-16</span><span className="sep">·</span><span className="val">LIVE</span></span>
            </span>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-num">$2.4M</div>
          <div className="stat-label">Volume hedged</div>
          <div className="stat-sub">↑ +$124K today</div>
        </div>
        <div className="stat">
          <div className="stat-num">847</div>
          <div className="stat-label">Positions opened</div>
          <div className="stat-sub">↑ 23 this hour</div>
        </div>
        <div className="stat">
          <div className="stat-num">73.2%</div>
          <div className="stat-label">Win rate</div>
          <div className="stat-sub">Last 30 days</div>
        </div>
        <div className="stat">
          <div className="stat-num">0</div>
          <div className="stat-label">Budget violations</div>
          <div className="stat-sub" style={{ color: 'var(--green)' }}>All caps enforced</div>
        </div>
      </div>

      <div className="section" id="tech">
        <p className="section-tag">Core architecture</p>
        <h2 className="section-title">Three primitives.<br/><em>One intelligent agent.</em></h2>
        <p className="section-sub">PredictAI weaves DeepBook Predict, Walrus Memory, and Claude AI into a single autonomous hedging system.</p>

        <div className="feat-grid">
          <div className="feat-card fc1">
            <p className="feat-num">01 — AI BRAIN</p>
            <h3 className="feat-title">Claude reads the vol surface</h3>
            <p className="feat-body">Every 5 minutes, the agent fetches <code style={{fontSize:'10px',padding:'1px 4px',background:'rgba(255,255,255,.06)',borderRadius:'2px'}}>OracleSVI</code> events from DeepBook Predict, analyzes implied volatility skew, and decides: hedge now, wait, or close.</p>
            <div className="term">
              <div className="term-bar"><div className="td td1"></div><div className="td td2"></div><div className="td td3"></div><span style={{fontSize:'9px',color:'var(--text3)',marginLeft:'6px',letterSpacing:'.04em'}}>AGENT LOG · 14:23:07</span></div>
              <div className="tl"><span className="k">oracle.iv_atm</span> = <span className="v">42.8%</span> <span style={{color:'var(--text3)'}}>// elevated</span></div>
              <div className="tl"><span className="k">oracle.skew</span> = <span className="v">-3.2%</span> <span style={{color:'var(--text3)'}}>// bearish lean</span></div>
              <div className="tl"><span className="k">confidence</span> = <span className="v">0.72</span> <span style={{color:'var(--text3)'}}>// threshold: 0.65</span></div>
              <div className="tl"><span className="k">decision</span> = <span className="v">"OPEN_HEDGE"</span></div>
              <div className="tl"><span className="k">direction</span> = <span className="v">"BTC_UP"</span> <span style={{color:'var(--text3)'}}>// 103K strike</span></div>
              <div className="tl" style={{color:'var(--text3)'}}>→ calling predict::mint... <span className="tcur"></span></div>
            </div>
          </div>

          <div className="feat-card fc2">
            <p className="feat-num">02 — EXECUTION</p>
            <h3 className="feat-title">DeepBook Predict — binary positions, vol-surface priced</h3>
            <p className="feat-body">The agent calls <code style={{fontSize:'10px',padding:'1px 4px',background:'rgba(255,255,255,.06)',borderRadius:'2px'}}>predict::mint</code> with dUSDC from your capped budget. Every action is checked against your mandate before firing. On settlement, <code style={{fontSize:'10px',padding:'1px 4px',background:'rgba(255,255,255,.06)',borderRadius:'2px'}}>predict::redeem_permissionless</code> auto-claims your payout.</p>
            <div className="vol-surface">
              <div className="vs-line" style={{bottom:'25%'}}></div>
              <div className="vs-line" style={{bottom:'50%'}}></div>
              <div className="vs-line" style={{bottom:'75%'}}></div>
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                <path d="M0,100 Q50,85 100,70 Q150,58 200,55 Q250,53 300,60 Q350,75 400,95 L400,120 L0,120 Z" fill="url(#vg)"/>
                <path d="M0,100 Q50,85 100,70 Q150,58 200,55 Q250,53 300,60 Q350,75 400,95" fill="none" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6"/>
                <line x1="200" y1="0" x2="200" y2="120" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="3,3"/>
                <circle cx="200" cy="55" r="3" fill="#c9a84c"/>
                <text x="205" y="50" fontSize="8" fill="#c9a84c" fontFamily="monospace" opacity="0.8">ATM 42.8%</text>
                <text x="4" y="115" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace">90K</text>
                <text x="92" y="115" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace">97K</text>
                <text x="187" y="115" fontSize="7" fill="#c9a84c" fontFamily="monospace" opacity="0.6">103K</text>
                <text x="285" y="115" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace">109K</text>
                <text x="370" y="115" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace">115K</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="section" id="how" style={{paddingTop:'60px'}}>
        <p className="section-tag">Execution flow</p>
        <h2 className="section-title">From oracle event<br/>to <em>settled payout</em></h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3 className="step-title">Agent reads vol surface</h3>
            <p className="step-body">Every 5 minutes, the agent fetches events. Claude analyzes implied vol, skew, and confidence score.</p>
            <div className="step-connector"></div>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3 className="step-title">Decision stored on Walrus</h3>
            <p className="step-body">Agent reasoning blob written to Walrus Memory. Verifiable forever.</p>
            <div className="step-connector"></div>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3 className="step-title">predict::mint fires</h3>
            <p className="step-body">If mandate check passes, agent calls `predict::mint` with dUSDC. Position opens.</p>
          </div>
        </div>
      </div>

      <div className="cta-wrap" style={{maxWidth:'1120px',margin:'0 auto 80px'}}>
        <div className="cta-grid">
          <div>
            <p className="section-tag" style={{marginBottom:'10px'}}>Built for Sui Overflow 2026</p>
            <h2 className="section-title" style={{fontSize:'clamp(28px,3vw,42px)',marginBottom:'10px'}}>The first autonomous<br/>hedging agent on Sui.</h2>
            <p style={{fontSize:'14px',color:'var(--text2)',lineHeight:1.7,maxWidth:'400px',fontWeight:300}}>AI agents that read vol surfaces, store reasoning on Walrus, and execute binary hedges on DeepBook Predict — while you sleep.</p>
            <div className="cta-tracks">
              <span className="cta-track">DEEPBOOK PREDICT</span>
              <span className="cta-track">WALRUS MEMORY</span>
              <span className="cta-track">AGENTIC WEB</span>
              <span className="cta-track">SUI OVERFLOW 2026</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px',alignItems:'flex-start'}}>
            <Link href="/dashboard" className="btn-primary" style={{width:'100%',justifyContent:'center'}}>Open Terminal →</Link>
            <a href="https://sui.io" target="_blank" rel="noreferrer" className="btn-ghost" style={{width:'100%',textAlign:'center'}}>Sui Testnet Docs</a>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-left">PREDICTAI © 2026 · SUI OVERFLOW HACKATHON · DEEPBOOK PREDICT</div>
        <div className="footer-links">
          <a href="#">GitHub</a>
          <a href="#">Docs</a>
          <a href="#">DeepSurge</a>
          <a href="https://t.me/+bZTS2KvwIBQyOGZl" target="_blank" rel="noreferrer">Telegram</a>
        </div>
      </footer>
    </div>
  );
}
