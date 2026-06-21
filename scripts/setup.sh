#!/bin/bash
# scripts/setup.sh — PredictAI dev environment setup

echo "=== Installing suiup (official Sui toolchain manager) ==="
curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh

echo "=== Switching to testnet ==="
suiup default testnet

echo "=== Installing frontend dependencies ==="
cd frontend
npm install
cd ..

echo "=== Installing agent dependencies ==="
cd agent
npm install
cd ..

echo "=== Setup complete! ==="
