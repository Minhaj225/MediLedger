#!/bin/bash

# MediLedger - Startup Script
# This script starts all services required for the MediLedger platform

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "  MediLedger - Starting All Services"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $HARDHAT_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Step 1: Start Hardhat Node
echo -e "${YELLOW}[1/4] Starting Hardhat local blockchain...${NC}"
cd "$PROJECT_DIR/blockchain"
npx hardhat node > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!
sleep 3

if ! kill -0 $HARDHAT_PID 2>/dev/null; then
    echo "ERROR: Hardhat node failed to start. Check /tmp/hardhat-node.log"
    exit 1
fi
echo -e "${GREEN}  Hardhat node running on http://localhost:8545 (PID: $HARDHAT_PID)${NC}"

# Step 2: Deploy Smart Contract
echo -e "${YELLOW}[2/4] Deploying MediLedger smart contract...${NC}"
cd "$PROJECT_DIR/blockchain"
npx hardhat run scripts/deploy.js --network localhost
echo -e "${GREEN}  Contract deployed successfully!${NC}"

# Step 3: Start Backend
echo -e "${YELLOW}[3/4] Starting backend server...${NC}"
cd "$PROJECT_DIR/backend"
node server.js > /tmp/mediledger-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend failed to start. Check /tmp/mediledger-backend.log"
    cleanup
    exit 1
fi
echo -e "${GREEN}  Backend running on http://localhost:5000 (PID: $BACKEND_PID)${NC}"

# Step 4: Start Frontend
echo -e "${YELLOW}[4/4] Starting React frontend...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none npm start > /tmp/mediledger-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5
echo -e "${GREEN}  Frontend running on http://localhost:3000${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}  MediLedger is running!${NC}"
echo "========================================="
echo ""
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:5000"
echo "  Blockchain: http://localhost:8545"
echo ""
echo "  Hardhat Accounts (for MetaMask):"
echo "  Account #0 (Owner): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "  Account #1 (Hospital): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "  Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo ""
echo "  Account #2 (Patient): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
echo "  Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo "  Account #3 (Doctor): 0x90F79bf6EB2c4f870365E785982E1f101E93b906"
echo "  Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
echo ""
echo "  Press Ctrl+C to stop all services."

# Wait for any background process to exit
wait
