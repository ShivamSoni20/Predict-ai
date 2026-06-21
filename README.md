# PredictAI Hedger

A decentralized autonomous agent that hedges crypto volatility using DeepBook Predict and the Mysten MemWal memory engine on the Sui blockchain.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   Agent           │     │   Smart Contracts│
│   (Next.js)      │────▶│   (Node.js/TS)    │────▶│   (Sui Move)     │
│   Dashboard +    │     │   Claude AI brain │     │   AgentMandate   │
│   Kill Switch    │     │   MemWal memory   │     │   + Predict      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

- **Agent**: Autonomous TypeScript agent that fetches live oracle data, uses Claude AI to reason about BTC volatility, and executes hedging trades via DeepBook Predict.
- **Contracts**: Sui Move smart contracts implementing `AgentMandate` (budget-capped delegation) with an emergency kill switch (`KillCap`).
- **Frontend**: Next.js dashboard showing live oracle state, open positions, and a wallet-connected emergency kill switch button.

## Testnet Deployment

| Item | Address |
| --- | --- |
| **Mandate Package** | `0x397cc6cc41321679626ab404a054a61ddf96ffdb011d01f3c899c418648708cd` |
| **Predict Package** | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| **AgentMandate** | `0x94a7bfc524683264e060a640dd6988adefa224fd80e9c7532505bcc1a16a8380` |
| **KillCap** | `0x337018f0a9de4089d24b9ff6726bc760dcfc0b5d0bc7d9fb7ea9a7060d2028e5` |
| **PredictManager** | `0x18273bb6e954412e33a5250afe8f3b72124856d682962716858714526b608d12` |
| **Agent Address** | `0xe4436372db77af0b69d61be90e847f24aeb775bf776e4d1ca5778abf732062da` |
| **Owner Address** | `0x5d16fce4821bba1fda9f30cf015054a1753b61a096ce2a94f9662aa772be7593` |

## Setup

### Prerequisites
- Node.js v20+
- Sui CLI (via `suiup`)

### 1. Install Sui CLI
```bash
bash scripts/setup.sh
```

### 2. Build Contracts
```bash
cd contracts
sui move build
```

### 3. Configure Environment
```bash
# Agent
cp agent/.env.example agent/.env
# Fill in SUI_PRIVATE_KEY, ANTHROPIC_API_KEY, MEMWAL_DELEGATE_KEY

# Frontend
cp frontend/.env.example frontend/.env
# Fill in NEXT_PUBLIC_ variables
```

### 4. Install Dependencies & Build Agent
```bash
cd agent
npm install
npx tsc
```

### 5. Start the Agent
```bash
cd agent
node dist/index.js
```

### 6. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000/dashboard
```

## Emergency Kill Switch

The owner can deactivate the agent's mandate at any time:
1. Open the dashboard at `/dashboard`
2. Connect the wallet holding the `KillCap` object
3. Click **Emergency Kill** to sign and execute the `kill_mandate` transaction
4. The agent will abort all future cycles with `E_MANDATE_KILLED`

## Key Technologies

- **Sui Move** — On-chain smart contracts with budget-capped agent delegation
- **DeepBook Predict** — Binary options for BTC volatility hedging
- **Claude AI** — Autonomous reasoning about market conditions
- **MemWal** — Persistent agent memory on Walrus (Sui's decentralized storage)
- **Walrus** — Immutable audit trail for all agent decisions
- **Next.js** — Real-time dashboard with wallet integration
