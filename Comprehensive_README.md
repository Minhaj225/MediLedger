# MediLedger — Decentralized Medical Records System

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. System Architecture](#2-system-architecture)
- [3. Key Actors & Workflows](#3-key-actors--workflows)
- [4. Smart Contract Design](#4-smart-contract-design)
- [5. Technology Stack](#5-technology-stack)
- [6. Project Structure](#6-project-structure)
- [7. Installation & Setup Guide](#7-installation--setup-guide)
- [8. Usage / Demo Flow](#8-usage--demo-flow)

---

## 1. Project Overview

**MediLedger** is a decentralized medical records management platform built on the Ethereum blockchain. It addresses the fundamental problem of **centralized, siloed medical data** — a reality where patient health records are scattered across disconnected hospital databases, inaccessible to the patients themselves, and nearly impossible to share securely between healthcare providers.

### The Problem

In traditional healthcare systems:

- **Patients have no ownership** of their own medical data. Records are locked inside hospital systems, requiring bureaucratic processes to access or transfer.
- **Data silos prevent interoperability.** When a patient visits a new hospital or specialist, their complete medical history is unavailable, leading to redundant tests, delayed diagnoses, and fragmented care.
- **Centralized storage is a security liability.** A single database breach can expose millions of sensitive health records.
- **There is no audit trail.** Patients cannot know who accessed their data, when, or why.

### The Solution

MediLedger shifts the paradigm from institution-owned to **patient-owned** medical data:

- **Hospitals** register on the platform and upload medical records. The actual medical files are stored via content-addressed hashing (simulated IPFS), while the metadata and access control logic live on the Ethereum blockchain.
- **Patients** own their records by virtue of their Ethereum wallet address. They can view their complete medical history across all hospitals, grant access to specific doctors, and revoke that access at any time — all through on-chain transactions.
- **Doctors** can request access from patients and, once authorized, view the patient's full medical history regardless of which hospital originally uploaded the records.

Every action — registration, record upload, access grant, access revocation — is recorded as an immutable transaction on the blockchain, providing a transparent and tamper-proof audit trail.

---

## 2. System Architecture

MediLedger is composed of three independent layers that communicate through well-defined interfaces:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser + MetaMask)                    │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │                                  │
           │  REST API (HTTP)                 │  Direct RPC via ethers.js
           │  (File upload/download,          │  (Contract function calls,
           │   contract ABI retrieval)        │   transaction signing)
           ▼                                  ▼
┌─────────────────────┐          ┌──────────────────────────────────┐
│   Express Backend   │          │      Ethereum Blockchain         │
│   (Port 5000)       │          │      (Hardhat Local Node)        │
│                     │          │      (Port 8545)                 │
│  ┌───────────────┐  │          │                                  │
│  │ IPFS Service  │  │          │  ┌────────────────────────────┐  │
│  │ (SHA-256      │  │          │  │  MediLedger.sol Contract   │  │
│  │  content-     │  │          │  │  ─────────────────────     │  │
│  │  addressed    │  │          │  │  • Hospital registry       │  │
│  │  local files) │  │          │  │  • Medical records index   │  │
│  └───────────────┘  │          │  │  • Access control matrix   │  │
│                     │          │  └────────────────────────────┘  │
│  ┌───────────────┐  │          │                                  │
│  │ Contract Info │──┼──reads───┤  deployments/localhost.json      │
│  │ API           │  │          │  (ABI + contract address)        │
│  └───────────────┘  │          │                                  │
└─────────────────────┘          └──────────────────────────────────┘
```

### Data Flow

1. **Frontend <-> Blockchain (Direct):** The React frontend connects to MetaMask via `ethers.js` (`BrowserProvider`). All smart contract interactions — registering hospitals, adding records, granting/revoking access, reading records — are executed as direct RPC calls from the browser to the Hardhat node. MetaMask handles transaction signing.

2. **Frontend <-> Backend (REST API):** The frontend communicates with the Express backend for two purposes:
   - **File operations:** Medical files are uploaded to the backend via `POST /api/ipfs/upload` (multipart form data). The backend generates a SHA-256 content hash and stores the file locally. The frontend then writes this hash to the blockchain via the smart contract.
   - **Contract discovery:** On wallet connection, the frontend fetches the deployed contract's address and ABI from `GET /api/contracts/info`, which reads from the deployment artifact generated during contract deployment.

3. **Backend <-> Blockchain (Indirect):** The backend does not interact with the blockchain directly at runtime. It reads the static deployment artifact (`blockchain/deployments/localhost.json`) created during the `npx hardhat run scripts/deploy.js` step.

### Key Design Decisions

- **Off-chain file storage, on-chain metadata:** Medical files (PDFs, images, etc.) are stored off-chain to avoid the prohibitive gas costs of on-chain storage. Only the content hash (acting as a pointer) is stored on the blockchain, preserving data integrity through content-addressing.
- **IPFS simulation:** The current implementation simulates IPFS locally using SHA-256 hashing and filesystem storage. This mirrors the content-addressed model of IPFS (same content always produces the same hash) while keeping the local development setup simple.
- **MetaMask as identity:** Ethereum wallet addresses serve as the identity layer. There is no username/password authentication — identity is cryptographic.

---

## 3. Key Actors & Workflows

MediLedger defines four distinct roles, each with specific permissions enforced at the smart contract level.

### 3.1 Platform Owner (Contract Deployer)

The account that deploys the `MediLedger` smart contract becomes the **owner**. This role is identified by the `owner` state variable and protected by the `onlyOwner` modifier.

**Capabilities:**
- **Register hospitals** — The owner is the only account that can call `registerHospital()`, providing a hospital's wallet address, name, and location. This is a gatekeeping mechanism to prevent unauthorized entities from uploading records.

**UI Behavior:**
- When the owner's wallet is connected, the Navbar displays an **"Owner"** badge next to the wallet address.
- The Hospital Dashboard reveals the **"Register a Hospital"** form exclusively when `isOwner` is `true`.

---

### 3.2 Hospitals

A hospital is an Ethereum address that has been registered by the platform owner. Hospital status is stored in the `hospitals` mapping and enforced by the `onlyRegisteredHospital` modifier.

**Capabilities:**

| Action | Smart Contract Function | Description |
|--------|------------------------|-------------|
| Upload medical records | `addMedicalRecord()` | Upload a medical file to IPFS (backend), then store the IPFS hash, record type, description, and timestamp on-chain linked to a patient's address. |
| View patient records | `getPatientRecords()` | A hospital that has uploaded at least one record for a patient automatically has read access to **all** of that patient's records (via `_hasHospitalAccess`). |

**Workflow:**
1. The owner registers the hospital's wallet address via the Hospital Dashboard.
2. The hospital connects with its registered wallet. The dashboard auto-detects registration status and displays the hospital's name, location, and ID.
3. To upload a record, the hospital enters the patient's wallet address, selects a file, chooses a record type (`Lab Report`, `X-Ray`, `MRI Scan`, `Prescription`, `Discharge Summary`, `Consultation Notes`, or `Other`), and provides a description.
4. The file is uploaded to the backend (`POST /api/ipfs/upload`), which returns a SHA-256 hash.
5. The hash and metadata are written to the blockchain via `addMedicalRecord()`.
6. The hospital can view records for any patient they have previously uploaded a record for.

**Record Types Available:**
- Lab Report
- X-Ray
- MRI Scan
- Prescription
- Discharge Summary
- Consultation Notes
- Other

---

### 3.3 Patients

Any Ethereum address that has medical records associated with it acts as a patient. Patients exercise ownership through the access control system.

**Capabilities:**

| Action | Smart Contract Function | Description |
|--------|------------------------|-------------|
| View own records | `getPatientRecords()` | Patients can always view their own records (the contract checks `msg.sender == _patient`). |
| Grant doctor access | `grantAccess()` | Grant a specific doctor's wallet address read access to all of the patient's records. |
| Revoke doctor access | `revokeAccess()` | Remove a doctor's access. The doctor can no longer call `getPatientRecords()` for this patient. |
| Check access status | `checkAccess()` | Verify whether a specific doctor currently has access. |
| Download files | Backend `GET /api/ipfs/:hash` | Download the original medical file using the IPFS hash from a record. |

**Workflow:**
1. The patient connects their wallet and navigates to the Patient Dashboard.
2. Records are **automatically loaded** on page mount — the dashboard calls `getPatientRecords(account)` and displays all records with their type, description, uploading hospital, timestamp, and a download link.
3. To grant access, the patient enters a doctor's wallet address and clicks "Grant Access," which triggers an on-chain transaction.
4. To revoke access, the patient enters the doctor's wallet address in the revoke section and clicks "Revoke Access."
5. The "Check Doctor Access" section allows the patient to verify whether a specific address currently has access, displaying a green "Access Granted" or red "Access Denied" badge.

**Cross-Hospital Sharing:** Because all records are indexed by the patient's wallet address regardless of which hospital uploaded them, a patient's complete medical history is aggregated in one view. When a patient grants a doctor access, the doctor can see records from **every** hospital — enabling true cross-hospital data sharing without any hospital-to-hospital coordination.

---

### 3.4 Doctors

A doctor is any Ethereum address that a patient has granted access to. There is no on-chain registration for doctors — access is purely permission-based.

**Capabilities:**

| Action | Smart Contract Function | Description |
|--------|------------------------|-------------|
| Check access status | `checkAccess()` | Verify whether they have been granted access to a patient's records. |
| View patient records | `getPatientRecords()` | If access is granted, view all of the patient's medical records. |
| Download files | Backend `GET /api/ipfs/:hash` | Download original medical files. |

**Workflow:**
1. The doctor connects their wallet and navigates to the Doctor Dashboard.
2. The doctor enters a patient's wallet address and clicks "View Records."
3. The dashboard first calls `checkAccess()` to verify authorization, displaying an **"Access Granted"** or **"Access Denied"** badge.
4. If access is granted, the dashboard calls `getPatientRecords()` and displays all records with download links.
5. If access is denied, the dashboard displays a message: *"You do not have access to this patient's records. Ask the patient to grant you access."*
6. An **"How to Request Access"** section provides step-by-step instructions, including the doctor's own wallet address for easy sharing with the patient.

---

## 4. Smart Contract Design

The `MediLedger.sol` contract (Solidity `^0.8.19`) is deployed as a single contract that manages hospital registration, medical record storage (metadata only), and patient-controlled access permissions.

### 4.1 Data Structures

#### Structs

```solidity
struct Hospital {
    uint256 id;            // Auto-incremented hospital ID
    string name;           // Hospital display name
    string location;       // Hospital location
    address walletAddress; // Hospital's Ethereum address
    bool isRegistered;     // Registration status flag
}

struct MedicalRecord {
    uint256 id;            // Auto-incremented record ID
    address patient;       // Patient's Ethereum address
    address hospital;      // Uploading hospital's address
    string ipfsHash;       // SHA-256 hash pointing to the stored file
    string recordType;     // Category (e.g., "Lab Report", "X-Ray")
    string description;    // Free-text description
    uint256 timestamp;     // Block timestamp at time of upload
}
```

#### State Variables

| Variable | Type | Visibility | Purpose |
|----------|------|------------|---------|
| `owner` | `address` | `public` | Contract deployer; the only account that can register hospitals. |
| `recordCounter` | `uint256` | `private` | Auto-incrementing counter for medical record IDs. |
| `hospitalCount` | `uint256` | `private` | Auto-incrementing counter for hospital IDs. |
| `hospitalAddresses` | `address[]` | `private` | Array of all registered hospital addresses. |

#### Mappings

| Mapping | Purpose |
|---------|---------|
| `mapping(address => Hospital) public hospitals` | Maps a hospital's wallet address to its `Hospital` struct. |
| `mapping(address => MedicalRecord[]) private patientRecords` | Maps a patient's wallet address to their array of `MedicalRecord` structs. |
| `mapping(address => mapping(address => bool)) private accessControl` | Nested mapping: `accessControl[patient][doctor]` stores whether a doctor has been granted access to a patient's records. |

### 4.2 Events

```solidity
event HospitalRegistered(address indexed hospitalAddress, string name);
event RecordAdded(uint256 recordId, address indexed patient, address indexed hospital);
event AccessGranted(address indexed patient, address indexed doctor);
event AccessRevoked(address indexed patient, address indexed doctor);
```

All critical state changes emit events, enabling off-chain indexing and audit trail reconstruction.

### 4.3 Modifiers (Access Control)

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can perform this action");
    _;
}

modifier onlyRegisteredHospital() {
    require(hospitals[msg.sender].isRegistered,
            "Only registered hospitals can perform this action");
    _;
}
```

### 4.4 Functions

#### `registerHospital(address _hospitalAddress, string _name, string _location)`

| Property | Value |
|----------|-------|
| **Access** | `onlyOwner` |
| **Validation** | Rejects if hospital already registered; rejects zero address. |
| **Logic** | Increments `hospitalCount`, creates a `Hospital` struct in the `hospitals` mapping, pushes the address to `hospitalAddresses`, emits `HospitalRegistered`. |

#### `addMedicalRecord(address _patient, string _ipfsHash, string _recordType, string _description)`

| Property | Value |
|----------|-------|
| **Access** | `onlyRegisteredHospital` |
| **Validation** | Rejects zero patient address; rejects empty IPFS hash. |
| **Logic** | Increments `recordCounter`, creates a `MedicalRecord` struct with `msg.sender` as the hospital and `block.timestamp`, pushes it to `patientRecords[_patient]`, emits `RecordAdded`. |

#### `grantAccess(address _doctor)`

| Property | Value |
|----------|-------|
| **Access** | Any address (intended for patients). |
| **Validation** | Rejects zero address; rejects if access already granted. |
| **Logic** | Sets `accessControl[msg.sender][_doctor] = true`, emits `AccessGranted`. |

#### `revokeAccess(address _doctor)`

| Property | Value |
|----------|-------|
| **Access** | Any address (intended for patients). |
| **Validation** | Rejects if access was not previously granted. |
| **Logic** | Sets `accessControl[msg.sender][_doctor] = false`, emits `AccessRevoked`. |

#### `getPatientRecords(address _patient) → MedicalRecord[]`

| Property | Value |
|----------|-------|
| **Access** | Authorized callers only (see below). |
| **Returns** | Array of all `MedicalRecord` structs for the patient. |
| **Authorization Logic** | The caller must satisfy **at least one** of three conditions: **(1)** The caller is the patient themselves (`msg.sender == _patient`). **(2)** The patient has explicitly granted the caller access (`accessControl[_patient][msg.sender] == true`). **(3)** The caller is a registered hospital that has uploaded at least one record for this patient (checked via the private `_hasHospitalAccess` function, which iterates through the patient's records). |

#### `checkAccess(address _patient, address _doctor) → bool`

| Property | Value |
|----------|-------|
| **Access** | Public (read-only, anyone can call). |
| **Returns** | `true` if the doctor has been granted explicit access by the patient, `false` otherwise. |

#### `getHospital(address _hospitalAddress) → Hospital`

| Property | Value |
|----------|-------|
| **Access** | Public (read-only). |
| **Returns** | The `Hospital` struct for the given address. |

#### `getRecordCount(address _patient) → uint256`

| Property | Value |
|----------|-------|
| **Access** | Public (read-only). |
| **Returns** | The number of medical records stored for the patient. |

#### `getHospitalAddresses() → address[]`

| Property | Value |
|----------|-------|
| **Access** | Public (read-only). |
| **Returns** | Array of all registered hospital wallet addresses. |

#### `_hasHospitalAccess(address _hospital, address _patient) → bool` *(private)*

| Property | Value |
|----------|-------|
| **Access** | Internal only. |
| **Logic** | Returns `false` if the hospital is not registered. Otherwise, iterates through all of the patient's records and returns `true` if any record's `hospital` field matches `_hospital`. This provides **implicit read access** to hospitals that have contributed records for a patient. |

### 4.5 Access Control Summary

| Caller | `registerHospital` | `addMedicalRecord` | `grantAccess` | `revokeAccess` | `getPatientRecords` |
|--------|-------------------|-------------------|---------------|----------------|-------------------|
| **Owner** | Yes | Only if also a registered hospital | Yes (as patient) | Yes (as patient) | Yes (if authorized) |
| **Hospital** | No | Yes | Yes (as patient) | Yes (as patient) | Yes (if uploaded records for patient) |
| **Patient** | No | No | Yes | Yes | Yes (own records) |
| **Doctor** | No | No | Yes (as patient) | Yes (as patient) | Yes (if granted access by patient) |
| **Other** | No | No | Yes (as patient) | Yes (as patient) | No |

### 4.6 Test Coverage

The smart contract has **21 unit tests** organized across 6 test suites, covering:

| Test Suite | Tests | Scenarios Covered |
|------------|-------|-------------------|
| **Deployment** | 1 | Owner is set correctly on deploy. |
| **Hospital Registration** | 4 | Happy path registration, non-owner rejection, duplicate rejection, zero-address rejection. |
| **Medical Records** | 5 | Happy path upload, non-hospital rejection, empty IPFS hash rejection, zero patient address rejection, multiple records for same patient. |
| **Access Control** | 5 | Grant access, zero-address rejection, duplicate grant rejection, revoke access, revoke without prior grant rejection. |
| **Record Viewing** | 5 | Patient views own records, authorized doctor views records, uploading hospital views records, unauthorized access rejected, access denied after revocation. |
| **Hospital Addresses** | 1 | `getHospitalAddresses()` returns all registered hospitals. |

Tests are run with: `cd blockchain && npx hardhat test`

---

## 5. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.4 | UI component library |
| React DOM | ^19.2.4 | DOM rendering |
| React Router DOM | ^7.13.1 | Client-side routing (`/`, `/hospital`, `/patient`, `/doctor`) |
| ethers.js | ^6.16.0 | Ethereum blockchain interaction, MetaMask integration, contract calls |
| Axios | ^1.13.6 | HTTP client for backend API calls |
| React Scripts | 5.0.1 | Create React App build toolchain (Webpack, Babel, ESLint) |
| @testing-library/react | ^16.3.2 | React component testing utilities |
| @testing-library/jest-dom | ^6.9.1 | Jest DOM matchers for testing |
| @testing-library/user-event | ^13.5.0 | User interaction simulation for tests |
| @testing-library/dom | ^10.4.1 | DOM testing utilities |
| web-vitals | ^2.1.4 | Core Web Vitals performance measurement |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | ^5.2.1 | HTTP server framework |
| CORS | ^2.8.6 | Cross-Origin Resource Sharing middleware |
| Multer | ^2.1.1 | Multipart form-data parsing for file uploads |
| Node.js `crypto` | Built-in | SHA-256 hashing for content-addressed file storage |
| Node.js `fs` | Built-in | Filesystem operations for file storage and retrieval |

### Blockchain

| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | 0.8.19 | Smart contract programming language |
| Hardhat | ^2.28.6 | Ethereum development environment, local blockchain node, testing |
| @nomicfoundation/hardhat-toolbox | ^4.0.0 | Bundled Hardhat plugins (ethers, chai matchers, gas reporter, coverage) |
| Chai | Bundled via hardhat-toolbox | Assertion library for smart contract tests |
| Mocha | Bundled via hardhat-toolbox | Test runner |

### Infrastructure & Tooling

| Technology | Purpose |
|------------|---------|
| MetaMask | Browser-based Ethereum wallet for identity and transaction signing |
| Hardhat Network | Local Ethereum blockchain for development (Chain ID: `31337`) |
| IPFS Simulation | Local content-addressed file storage using SHA-256 hashing |

---

## 6. Project Structure

```
mediledger/
│
├── blockchain/                          # Smart contract layer
│   ├── contracts/
│   │   └── MediLedger.sol               # Main smart contract (hospital registry,
│   │                                    #   medical records, access control)
│   ├── scripts/
│   │   └── deploy.js                    # Contract deployment script
│   │                                    #   (saves ABI + address to deployments/)
│   ├── test/
│   │   └── MediLedger.test.js           # 21 unit tests covering all contract
│   │                                    #   functions and access control
│   ├── deployments/
│   │   └── localhost.json               # Deployment artifact: contract address,
│   │                                    #   deployer, ABI, network, timestamp
│   ├── artifacts/                       # Compiled contract artifacts (auto-generated)
│   ├── cache/                           # Hardhat compilation cache
│   ├── hardhat.config.js                # Hardhat configuration (Solidity 0.8.19,
│   │                                    #   localhost network at :8545)
│   └── package.json                     # Blockchain dependencies
│
├── backend/                             # API & file storage layer
│   ├── server.js                        # Express server entry point (port 5000),
│   │                                    #   middleware setup, route mounting
│   ├── routes/
│   │   ├── ipfs.js                      # POST /api/ipfs/upload — file upload
│   │   │                                #   (multer, 50MB limit)
│   │   │                                # GET /api/ipfs/:hash — file download
│   │   └── contracts.js                 # GET /api/contracts/info — returns deployed
│   │                                    #   contract ABI and address
│   ├── services/
│   │   └── ipfsService.js               # IPFS simulation: SHA-256 content hashing,
│   │                                    #   local filesystem read/write
│   ├── uploads/                         # Content-addressed file storage directory
│   └── package.json                     # Backend dependencies (Express 5, CORS, Multer)
│
├── frontend/                            # User interface layer
│   ├── public/
│   │   ├── index.html                   # HTML template (<title>MediLedger</title>)
│   │   ├── icon-medi.png                # Custom MediLedger favicon
│   │   ├── manifest.json                # PWA manifest
│   │   └── robots.txt                   # Robots configuration
│   ├── src/
│   │   ├── index.js                     # React entry point (ReactDOM.createRoot)
│   │   ├── App.js                       # Root component: Web3Provider, Router, routes
│   │   ├── App.css                      # Complete application stylesheet (612 lines)
│   │   ├── context/
│   │   │   └── Web3Context.js           # React Context for MetaMask connection,
│   │   │                                #   ethers.js provider/signer, contract instance,
│   │   │                                #   owner detection, account change listeners
│   │   ├── components/
│   │   │   └── Navbar.js                # Navigation bar: brand, role links,
│   │   │                                #   wallet status (address + owner badge)
│   │   └── pages/
│   │       ├── Home.js                  # Landing page: hero, wallet connect button,
│   │       │                            #   role selection cards, "How It Works" grid
│   │       ├── HospitalDashboard.js     # Hospital registration (owner only),
│   │       │                            #   record upload (file + blockchain),
│   │       │                            #   patient record viewing
│   │       ├── PatientDashboard.js      # Record viewing (auto-loaded), grant access,
│   │       │                            #   revoke access, check access status
│   │       └── DoctorDashboard.js       # Access verification, record viewing,
│   │                                    #   "How to Request Access" instructions
│   ├── package.json                     # Frontend dependencies (React 19, ethers 6,
│   │                                    #   React Router 7, Axios)
│   └── README.md                        # CRA default README
│
├── start.sh                             # One-command startup script: starts Hardhat node,
│                                        #   deploys contract, starts backend, starts
│                                        #   frontend, prints test account info
├── README.md                            # Project overview and quick start guide
└── .gitignore                           # Ignores: node_modules/, cache/, artifacts/,
                                         #   .env, uploads/, build/
```

---

## 7. Installation & Setup Guide

### 7.1 Prerequisites

Before setting up MediLedger, ensure you have the following installed:

| Requirement | Minimum Version | Purpose |
|-------------|----------------|---------|
| **Node.js** | v18+ | Runtime for backend server, Hardhat, and React build tools |
| **npm** | v9+ (bundled with Node.js) | Package management |
| **MetaMask** | Latest | Browser extension for Ethereum wallet management |
| **Git** | Latest | Source code cloning |

> **Note:** No `.env` file is required for local development. The backend port defaults to `5000`, and all blockchain configuration uses Hardhat's built-in localhost settings.

### 7.2 Clone the Repository

```bash
git clone <repository-url>
cd mediledger
```

### 7.3 Install Dependencies

Install dependencies for all three layers:

```bash
# Blockchain dependencies (Hardhat, Solidity compiler, test tools)
cd blockchain && npm install

# Backend dependencies (Express, CORS, Multer)
cd ../backend && npm install

# Frontend dependencies (React, ethers.js, Axios)
cd ../frontend && npm install

# Return to project root
cd ..
```

### 7.4 Option A: Automated Startup (Recommended)

The `start.sh` script handles everything — starting the blockchain, deploying the contract, and launching both servers:

```bash
chmod +x start.sh
./start.sh
```

This script performs four steps in sequence:

1. **Starts the Hardhat local blockchain** on `http://localhost:8545`
2. **Deploys the MediLedger smart contract** and saves the deployment artifact to `blockchain/deployments/localhost.json`
3. **Starts the Express backend** on `http://localhost:5000`
4. **Starts the React frontend** on `http://localhost:3000`

Once running, the script prints test account addresses and private keys for MetaMask import. Press `Ctrl+C` to gracefully shut down all services.

### 7.5 Option B: Manual Startup

If you prefer to run each service in separate terminal windows:

**Terminal 1 — Blockchain Node:**
```bash
cd blockchain
npx hardhat node
```
This starts a local Ethereum node with 20 pre-funded test accounts.

**Terminal 2 — Contract Deployment:**
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
This compiles the Solidity contract, deploys it, and saves the ABI + contract address to `blockchain/deployments/localhost.json`.

**Terminal 3 — Backend Server:**
```bash
cd backend
node server.js
```
The backend starts on `http://localhost:5000`.

**Terminal 4 — Frontend:**
```bash
cd frontend
npm start
```
The React app starts on `http://localhost:3000` and opens in your default browser.

### 7.6 Configure MetaMask

After all services are running, configure MetaMask to connect to the local blockchain:

**Step 1: Add the Hardhat Network**

Open MetaMask → Settings → Networks → Add Network → Add Manually:

| Field | Value |
|-------|-------|
| Network Name | `Hardhat Local` |
| RPC URL | `http://localhost:8545` |
| Chain ID | `31337` |
| Currency Symbol | `ETH` |

**Step 2: Import Test Accounts**

Import these pre-funded accounts using their private keys (MetaMask → Import Account):

| Account | Role | Address | Private Key |
|---------|------|---------|-------------|
| Account #0 | **Owner** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Account #1 | **Hospital** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| Account #2 | **Patient** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| Account #3 | **Doctor** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

> **Important:** These are Hardhat's default test accounts with well-known private keys. **Never use them on mainnet or testnets.**

### 7.7 Running Smart Contract Tests

```bash
cd blockchain
npx hardhat test
```

This runs all 21 unit tests covering deployment, hospital registration, medical records, access control, record viewing, and hospital address tracking.

---

## 8. Usage / Demo Flow

This walkthrough demonstrates the complete MediLedger workflow using the four test accounts from Section 7.6.

### Step 1: Connect as the Platform Owner

1. Open `http://localhost:3000` in your browser.
2. In MetaMask, switch to **Account #0** (Owner: `0xf39F...2266`).
3. Click **"Connect MetaMask Wallet"** on the landing page.
4. The Navbar should show the truncated address with an **"Owner"** badge.
5. Three role cards appear — click **"Hospital"** to navigate to the Hospital Dashboard.

### Step 2: Register a Hospital

1. On the Hospital Dashboard, you will see the **"Register a Hospital"** form (visible only to the owner).
2. Fill in the form:
   - **Hospital Wallet Address:** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Account #1)
   - **Hospital Name:** `City General Hospital`
   - **Location:** `New York, NY`
3. Click **"Register Hospital"** and confirm the MetaMask transaction.
4. A success message appears: *"Hospital 'City General Hospital' registered successfully!"*

### Step 3: Upload a Medical Record (as Hospital)

1. In MetaMask, switch to **Account #1** (Hospital: `0x7099...79C8`).
2. The page should automatically refresh (MetaMask triggers an `accountsChanged` event).
3. An info card now shows: **Your Hospital — City General Hospital, New York, NY, #1**.
4. In the **"Upload Medical Record"** section:
   - **Patient Wallet Address:** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (Account #2)
   - **Medical File:** Select any file (PDF, image, etc.)
   - **Record Type:** Select `Lab Report`
   - **Description:** `Complete blood count results — March 2026`
5. Click **"Upload Record"** and confirm the MetaMask transaction.
6. The status progresses: *"Uploading file to IPFS..."* → *"File uploaded. Saving record to blockchain..."* → *"Medical record uploaded successfully!"*

### Step 4: View Records as the Patient

1. In MetaMask, switch to **Account #2** (Patient: `0x3C44...93BC`).
2. Navigate to the **Patient Dashboard** (click "Patient" in the navbar).
3. Your medical records are **automatically loaded** and displayed under "My Medical Records."
4. Each record shows:
   - Record type badge (e.g., **Lab Report**)
   - Timestamp
   - Description
   - Uploading hospital address (truncated)
   - IPFS hash (truncated)
   - A **"Download File"** link to retrieve the original file

### Step 5: Grant Access to a Doctor

1. Still on the Patient Dashboard as **Account #2**.
2. In the **"Grant Access to Doctor"** section:
   - Enter the doctor's address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (Account #3)
3. Click **"Grant Access"** and confirm the transaction.
4. Status: *"Access granted to 0x90F79b..."*
5. **(Optional)** Verify by using the **"Check Doctor Access"** section — enter the doctor's address and click "Check." A green badge confirms: *"This doctor HAS access to your records."*

### Step 6: View Records as the Doctor

1. In MetaMask, switch to **Account #3** (Doctor: `0x90F7...b906`).
2. Navigate to the **Doctor Dashboard** (click "Doctor" in the navbar).
3. Enter the patient's address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`.
4. Click **"View Records."**
5. A green **"Access Granted"** badge appears, and the patient's records are displayed with download links.

### Step 7: Revoke Access

1. Switch back to **Account #2** (Patient) in MetaMask.
2. Go to the **Patient Dashboard.**
3. In the **"Revoke Doctor Access"** section:
   - Enter the doctor's address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
4. Click **"Revoke Access"** and confirm the transaction.
5. Status: *"Access revoked for 0x90F79b..."*

### Step 8: Verify Revocation

1. Switch to **Account #3** (Doctor) in MetaMask.
2. On the **Doctor Dashboard**, enter the patient's address again and click "View Records."
3. A red **"Access Denied"** badge appears with the message: *"You do not have access to this patient's records. Ask the patient to grant you access."*

---

### API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check — returns `{ status: "ok", timestamp: "..." }` |
| `POST` | `/api/ipfs/upload` | Upload a file (multipart form, field: `file`, max 50MB) |
| `GET` | `/api/ipfs/:hash` | Download a file by its SHA-256 content hash |
| `GET` | `/api/contracts/info` | Get deployed contract address, ABI, network, and deployment timestamp |

---

### Service Ports

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | `http://localhost:3000` | React application |
| Backend | `http://localhost:5000` | Express API server |
| Blockchain | `http://localhost:8545` | Hardhat local Ethereum node |

---

*MediLedger — Empowering patients with ownership of their medical data through blockchain technology.*
