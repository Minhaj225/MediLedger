# MediLedger - Decentralized Medical Records System

A blockchain-based platform where hospitals upload patient medical records, and patients own and control access to their health data.

## Architecture

```
[React Frontend :3000] <--MetaMask/ethers.js--> [Hardhat Blockchain :8545]
[React Frontend :3000] <-----REST API-------> [Express Backend :5000]
                                                      |
                                              [IPFS Simulation (local)]
```

## Tech Stack

- **Frontend:** React.js, ethers.js, React Router, Axios
- **Backend:** Node.js, Express, Multer
- **Blockchain:** Solidity 0.8.19, Hardhat
- **Storage:** Local IPFS simulation (SHA-256 content-addressed file storage)
- **Wallet:** MetaMask

## Prerequisites

- Node.js v18+
- MetaMask browser extension
- Git

## Quick Start

### 1. Install Dependencies

```bash
# Blockchain
cd blockchain && npm install

# Backend
cd ../backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Start All Services

```bash
./start.sh
```

This starts the Hardhat node, deploys the contract, and launches the backend and frontend.

### 3. Configure MetaMask

1. Open MetaMask and add a custom network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. Import test accounts using private keys (printed when `start.sh` runs):
   - **Account #0 (Owner):** Deploys the contract, registers hospitals
   - **Account #1 (Hospital):** Uploads patient records
   - **Account #2 (Patient):** Views records, manages access
   - **Account #3 (Doctor):** Views authorized patient records

## Manual Setup

### Start Hardhat Node
```bash
cd blockchain
npx hardhat node
```

### Deploy Contract (in a new terminal)
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Start Backend
```bash
cd backend
node server.js
```

### Start Frontend
```bash
cd frontend
npm start
```

## Smart Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `registerHospital(address, name, location)` | Owner only | Register a hospital on the platform |
| `addMedicalRecord(patient, ipfsHash, type, desc)` | Registered hospitals | Upload a medical record |
| `grantAccess(doctorAddress)` | Patient (caller) | Grant a doctor access to records |
| `revokeAccess(doctorAddress)` | Patient (caller) | Revoke a doctor's access |
| `getPatientRecords(patientAddress)` | Authorized only | View patient's medical records |
| `checkAccess(patient, doctor)` | Anyone | Check if doctor has access |

## Testing

### Smart Contract Tests
```bash
cd blockchain
npx hardhat test
```

### End-to-End Test Workflow

1. Connect MetaMask with Account #0 (Owner)
2. Go to Hospital Dashboard, register Account #1 as a hospital
3. Switch MetaMask to Account #1 (Hospital)
4. Upload a medical record for Account #2 (Patient)
5. Switch to Account #2 (Patient)
6. Go to Patient Dashboard, view records
7. Grant access to Account #3 (Doctor)
8. Switch to Account #3 (Doctor)
9. Go to Doctor Dashboard, enter Patient's address to view records
10. Switch back to Account #2, revoke Doctor's access
11. Verify Doctor can no longer view records

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ipfs/upload` | Upload file (multipart form data) |
| `GET` | `/api/ipfs/:hash` | Retrieve file by hash |
| `GET` | `/api/contracts/info` | Get contract ABI and address |
| `GET` | `/api/health` | Health check |

## Project Structure

```
mediledger/
├── blockchain/
│   ├── contracts/
│   │   └── MediLedger.sol          # Smart contract
│   ├── test/
│   │   └── MediLedger.test.js      # Contract tests (21 tests)
│   ├── scripts/
│   │   └── deploy.js               # Deployment script
│   ├── deployments/
│   │   └── localhost.json           # Deployed contract info
│   └── hardhat.config.js
├── backend/
│   ├── server.js                    # Express server
│   ├── routes/
│   │   ├── ipfs.js                  # File upload/download
│   │   └── contracts.js             # Contract info API
│   ├── services/
│   │   └── ipfsService.js           # IPFS simulation
│   └── uploads/                     # Stored files
├── frontend/
│   └── src/
│       ├── context/
│       │   └── Web3Context.js       # MetaMask + contract context
│       ├── components/
│       │   └── Navbar.js
│       └── pages/
│           ├── Home.js              # Landing page
│           ├── HospitalDashboard.js # Hospital features
│           ├── PatientDashboard.js  # Patient features
│           └── DoctorDashboard.js   # Doctor features
├── start.sh                         # Start all services
└── README.md
```
