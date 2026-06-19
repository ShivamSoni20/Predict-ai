# PredictAI Hedger

A decentralized autonomous agent that hedges crypto volatility using DeepBook and the Mysten MemWal memory engine on the Sui blockchain.

## Setup

We now use the official `suiup` toolchain manager to install and manage Sui versions.

1. Run the setup script:
   ```bash
   bash scripts/setup.sh
   ```
2. Build contracts:
   ```bash
   cd contracts
   sui move build
   ```
3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
4. Start the agent:
   ```bash
   cd agent
   npm start
   ```
