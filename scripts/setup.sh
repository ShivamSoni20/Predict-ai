#!/bin/bash
# scripts/setup.sh — PredictAI dev environment setup

echo "=== Installing suiup (official Sui toolchain manager) ==="
curl -sL https://sui.io/suiup/install | bash

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
