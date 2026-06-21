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
            <span className="sym">TRACK</span>
            <span className="price">DeepBook Predict</span>
            <span className="change">LIVE</span>
          </div>
          <div className="nav-ticker">
            <span className="sym">MEMORY</span>
            <span className="price">Walrus</span>
            <span className="change">VERIFIABLE</span>
          </div>
        </div>
        <div className="nav-links">
          <a href="#flow">Flow</a>
          <a href="#tech">Technology</a>
          <a href="https://sui.io" target="_blank" rel="noreferrer">Sui Network</a>
        </div>
        <Link href="/dashboard" className="nav-btn">Open Terminal</Link>
      </nav>

      <section className="hero">
        <div className="hero-grid"></div>
        <div className="live-badge">
          <span className="live-dot"></span>
          LIVE ON SUI TESTNET WITH DEEPBOOK PREDICT
        </div>

        <p className="hero-eyebrow">Autonomous hedging. Verifiable memory. On-chain execution.</p>
        <h1 className="hero-title">DeepBook predicts.<br/><span className="gold">PredictAI hedges.</span></h1>
        <h2 className="hero-title-2">Walrus remembers.</h2>
        <p className="hero-sub">
          PredictAI reads live DeepBook Predict volatility markets, recalls similar past outcomes from Walrus Memory, and submits mandate-capped hedge decisions on Sui testnet.
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn-primary">Open Agent Terminal</Link>
          <a href="#flow" className="btn-ghost">See execution flow</a>
        </div>
      </section>

      <section className="section" id="tech">
        <p className="section-tag">Core architecture</p>
        <h2 className="section-title">Predict is the execution engine.<br/><em>Walrus is the memory layer.</em></h2>
        <p className="section-sub">
          The agent is built around a real testnet loop: oracle reads, memory-influenced reasoning, Walrus audit blobs, and DeepBook Predict mint or redeem transactions.
        </p>

        <div className="feat-grid">
          <div className="feat-card fc1">
            <p className="feat-num">01 - DEEPBOOK PREDICT</p>
            <h3 className="feat-title">Live volatility markets</h3>
            <p className="feat-body">The agent reads rolling BTC oracle data, strike premiums, open positions, and settled positions from the public Predict surface.</p>
            <div className="term">
              <div className="tl"><span className="k">oracle.atm_iv</span> = <span className="v">live</span></div>
              <div className="tl"><span className="k">action</span> = <span className="v">predict::mint or redeem</span></div>
              <div className="tl"><span className="k">asset</span> = <span className="v">dUSDC</span></div>
            </div>
          </div>

          <div className="feat-card fc2">
            <p className="feat-num">02 - WALRUS MEMORY</p>
            <h3 className="feat-title">Decisions become inspectable artifacts</h3>
            <p className="feat-body">Every cycle stores the oracle snapshot, memory signal, decision, transaction digest, and outcome as retrievable Walrus/MemWal records.</p>
            <div className="term">
              <div className="tl"><span className="k">memory</span> = <span className="v">2/3 wins in similar IV</span></div>
              <div className="tl"><span className="k">confidence_delta</span> = <span className="v">+5%</span></div>
              <div className="tl"><span className="k">audit_blob</span> = <span className="v">clickable in dashboard</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="flow" style={{paddingTop:'60px'}}>
        <p className="section-tag">Judge demo flow</p>
        <h2 className="section-title">From oracle event<br/>to verifiable action</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3 className="step-title">Read Predict market</h3>
            <p className="step-body">Fetch active oracle, strike premiums, and current PredictManager positions.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3 className="step-title">Recall similar outcomes</h3>
            <p className="step-body">MemWal returns prior outcomes near the same IV and skew regime, producing a confidence adjustment.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3 className="step-title">Execute or skip</h3>
            <p className="step-body">The mandate gate checks budget and authority before the agent mints, redeems, or safely holds.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-left">PREDICTAI - DEEPBOOK PREDICT + WALRUS MEMORY - SUI TESTNET</div>
        <div className="footer-links">
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://docs.wal.app/" target="_blank" rel="noreferrer">Walrus</a>
          <a href="https://sui.io" target="_blank" rel="noreferrer">Sui</a>
        </div>
      </footer>
    </div>
  );
}
