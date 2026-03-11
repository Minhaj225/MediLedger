# MediLedger - Decentralized Medical Records System Design

## Overview

MediLedger is a decentralized platform where hospitals register and upload patient medical records. Data is stored using blockchain (Ethereum/Hardhat) and simulated IPFS. Patients own their records and can grant/revoke access to doctors.

## Architecture

```
[React Frontend] <--MetaMask/ethers.js--> [Hardhat Local Blockchain]
[React Frontend] <--REST API--> [Node.js/Express Backend]
                                       |
                               [Local IPFS Simulation]
```

- Frontend talks directly to blockchain via ethers.js + MetaMask for all on-chain operations
- Backend handles IPFS file storage only
- Smart contract manages all access control and record metadata

## Actors

- **Hospital**: Register on platform, upload patient records, update data
- **Patient**: View medical history, grant/revoke doctor access, share records
- **Doctor**: Request access, view authorized patient records
- **Platform Owner**: Deploys contract, registers hospitals

## Smart Contract (`MediLedger.sol`)

### Data Structures
- `Hospital` struct: id, name, location, walletAddress, isRegistered
- `MedicalRecord` struct: id, patientAddress, hospitalAddress, ipfsHash, recordType, description, timestamp
- `patientRecords` mapping: patient address → record array
- `accessControl` mapping: patient address → doctor address → bool
- `hospitals` mapping: address → Hospital

### Functions
- `registerHospital(name, location)` - owner only
- `addMedicalRecord(patientAddress, ipfsHash, recordType, description)` - registered hospitals only
- `grantAccess(doctorAddress)` - patient only
- `revokeAccess(doctorAddress)` - patient only
- `getPatientRecords(patientAddress)` - authorized callers only (patient, granted doctor, uploading hospital)

### Events
- `HospitalRegistered(address, name)`
- `RecordAdded(uint256 recordId, address patient, address hospital)`
- `AccessGranted(address patient, address doctor)`
- `AccessRevoked(address patient, address doctor)`

## Backend (Node.js/Express)

### Routes
- `POST /api/ipfs/upload` - Upload file, returns simulated CID (SHA-256 hash)
- `GET /api/ipfs/:hash` - Retrieve file by hash
- `GET /api/contracts/info` - Returns ABI and deployed contract address

### IPFS Simulation
- Files stored in `./uploads/` directory
- SHA-256 content hashing for content-addressable storage
- Returns hash as simulated IPFS CID

## Frontend (React.js)

### Pages
- **Landing Page**: Role selection, MetaMask connection
- **Hospital Dashboard**: Register hospital, upload records, view uploads
- **Patient Dashboard**: View records, manage access control, download files
- **Doctor Dashboard**: View authorized patient records

### Tech
- React Router for navigation
- ethers.js for blockchain interaction
- MetaMask for wallet/auth
- CSS modules or plain CSS for styling

## Testing
- Hardhat + Chai for smart contract unit tests
- Manual end-to-end testing workflow

## Technology Stack
- Frontend: React.js
- Backend: Node.js + Express
- Blockchain: Ethereum (Hardhat local network)
- Smart Contracts: Solidity
- Framework: Hardhat
- Storage: Local IPFS simulation
- Wallet: MetaMask
