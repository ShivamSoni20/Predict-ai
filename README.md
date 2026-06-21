# PredictAI Hedger

PredictAI is an autonomous hedging agent for the **DeepBook Predict** track.

DeepBook Predict is the execution engine: the agent reads live BTC oracle data, selects strikes, mints or redeems Predict positions, and respects a Sui Move mandate that caps spend and gives the owner an emergency stop.

Walrus and MemWal are the verifiable memory layer: every cycle records what the agent saw, what it remembered, why it acted, and what happened on-chain.

## What the Demo Shows

1. The agent fetches a live DeepBook Predict oracle, strike list, and current positions.
2. It reads the on-chain `AgentMandate` object and aborts if the mandate is inactive, expired, unauthorized, or under budget.
3. It recalls similar past outcomes from MemWal and computes a visible memory signal, for example: `Similar past setup: 2/3 wins, confidence +5%.`
4. Claude returns a strict JSON decision: `OPEN_HEDGE`, `HOLD`, or `SKIP`.
5. The agent stores reasoning and audit records on Walrus/MemWal.
6. If the decision clears all checks, the agent calls DeepBook Predict on Sui testnet.
7. The dashboard shows market data, mandate state, memory-influenced reasoning, Walrus audit blobs, positions, and the kill switch.

## Architecture

```text
Frontend dashboard
  - live market state
  - mandate status
  - memory signal
  - Walrus audit preview
  - wallet kill switch

TypeScript agent
  - DeepBook Predict oracle reads
  - Claude reasoning
  - MemWal recall
  - Walrus audit writes
  - Sui transaction execution

Sui Move contract
  - AgentMandate budget gate
  - KillCap emergency stop
  - spend and kill events
```

## Current Testnet Objects

| Item | Address |
| --- | --- |
| Mandate Package | `0x397cc6cc41321679626ab404a054a61ddf96ffdb011d01f3c899c418648708cd` |
| Predict Package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| AgentMandate | `0x94a7bfc524683264e060a640dd6988adefa224fd80e9c7532505bcc1a16a8380` |
| KillCap | `0x337018f0a9de4089d24b9ff6726bc760dcfc0b5d0bc7d9fb7ea9a7060d2028e5` |
| PredictManager | `0x18273bb6e954412e33a5250afe8f3b72124856d682962716858714526b608d12` |
| Agent Address | `0xe4436372db77af0b69d61be90e847f24aeb775bf776e4d1ca5778abf732062da` |
| Owner Address | `0x5d16fce4821bba1fda9f30cf015054a1753b61a096ce2a94f9662aa772be7593` |

## Setup

### 1. Install dependencies

```bash
bash scripts/setup.sh
```

Or install manually:

```bash
cd agent && npm install
cd ../frontend && npm install
```

### 2. Configure the agent

```bash
cp agent/.env.example agent/.env
```

Fill in:

- `SUI_PRIVATE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `MEMWAL_AGENT_ADDRESS`
- `MEMWAL_DELEGATE_KEY`
- `WALRUS_PUBLISHER_URL`
- `WALRUS_AGGREGATOR_URL`
- DeepBook Predict object IDs
- `DUSDC_COIN_TYPE`

### 3. Configure the frontend

```bash
cp frontend/.env.example frontend/.env.local
```

Fill in the public package/object IDs and the same Predict/Walrus endpoints used by the agent.

### 4. Build the contract

```bash
cd contracts
sui move build
```

### 5. Run the agent

```bash
cd agent
npm run start
```

### 6. Run the dashboard

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Judge Demo Script

1. Start the agent and show the health logs for Predict, MemWal, and Walrus.
2. Open the dashboard and show live oracle/strike data.
3. Point to the mandate panel and show real on-chain budget/active state.
4. Point to the memory panel and show how prior outcomes adjusted confidence.
5. Open a Walrus audit blob from the dashboard and inspect the JSON record.
6. If conditions are safe, let the agent mint or redeem a Predict position.
7. Verify the Sui transaction digest.
8. Connect the owner wallet and trigger the emergency kill switch.

## Safety Model

- The agent cannot spend unless `AgentMandate` is active, unexpired, and authorizes the agent address.
- Every spend is recorded before minting a Predict position.
- The owner can kill the mandate with the matching `KillCap`.
- The contract rejects a mismatched `KillCap` so one mandate's cap cannot be used against another mandate.
- Claude output is parsed strictly; invalid output falls back to `HOLD`.

## Useful Commands

```bash
cd agent && npx tsc
cd frontend && npm run build
cd contracts && sui move build
```
