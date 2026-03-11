# MediLedger Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a decentralized medical records platform where hospitals upload records to blockchain+IPFS and patients control access.

**Architecture:** React frontend communicates with Hardhat blockchain via ethers.js/MetaMask for on-chain operations, and with Node.js/Express backend for IPFS file storage. Single Solidity smart contract manages all access control and record metadata.

**Tech Stack:** React.js, Node.js/Express, Solidity, Hardhat, ethers.js, MetaMask

---

## Chunk 1: Project Setup and Smart Contract

### Task 1: Initialize Hardhat Project

**Files:**
- Create: `blockchain/hardhat.config.js`
- Create: `blockchain/package.json`

- [ ] **Step 1: Initialize blockchain directory with Hardhat**

```bash
mkdir -p blockchain
cd blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init  # select "Create a JavaScript project"
```

- [ ] **Step 2: Verify Hardhat setup**

```bash
cd blockchain
npx hardhat compile
```

Expected: Compilation successful

- [ ] **Step 3: Commit**

```bash
git add blockchain/
git commit -m "chore: initialize Hardhat project"
```

### Task 2: Write Smart Contract

**Files:**
- Create: `blockchain/contracts/MediLedger.sol`

- [ ] **Step 1: Write the MediLedger smart contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MediLedger {
    address public owner;
    uint256 private recordCounter;

    struct Hospital {
        uint256 id;
        string name;
        string location;
        address walletAddress;
        bool isRegistered;
    }

    struct MedicalRecord {
        uint256 id;
        address patient;
        address hospital;
        string ipfsHash;
        string recordType;
        string description;
        uint256 timestamp;
    }

    mapping(address => Hospital) public hospitals;
    mapping(address => MedicalRecord[]) private patientRecords;
    mapping(address => mapping(address => bool)) private accessControl;
    
    uint256 private hospitalCount;

    event HospitalRegistered(address indexed hospitalAddress, string name);
    event RecordAdded(uint256 recordId, address indexed patient, address indexed hospital);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyRegisteredHospital() {
        require(hospitals[msg.sender].isRegistered, "Only registered hospitals can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerHospital(address _hospitalAddress, string memory _name, string memory _location) public onlyOwner {
        require(!hospitals[_hospitalAddress].isRegistered, "Hospital already registered");
        hospitalCount++;
        hospitals[_hospitalAddress] = Hospital(hospitalCount, _name, _location, _hospitalAddress, true);
        emit HospitalRegistered(_hospitalAddress, _name);
    }

    function addMedicalRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _recordType,
        string memory _description
    ) public onlyRegisteredHospital {
        recordCounter++;
        MedicalRecord memory record = MedicalRecord(
            recordCounter,
            _patient,
            msg.sender,
            _ipfsHash,
            _recordType,
            _description,
            block.timestamp
        );
        patientRecords[_patient].push(record);
        emit RecordAdded(recordCounter, _patient, msg.sender);
    }

    function grantAccess(address _doctor) public {
        require(_doctor != address(0), "Invalid doctor address");
        require(!accessControl[msg.sender][_doctor], "Access already granted");
        accessControl[msg.sender][_doctor] = true;
        emit AccessGranted(msg.sender, _doctor);
    }

    function revokeAccess(address _doctor) public {
        require(accessControl[msg.sender][_doctor], "Access not granted");
        accessControl[msg.sender][_doctor] = false;
        emit AccessRevoked(msg.sender, _doctor);
    }

    function getPatientRecords(address _patient) public view returns (MedicalRecord[] memory) {
        require(
            msg.sender == _patient ||
            accessControl[_patient][msg.sender] ||
            _hasHospitalAccess(msg.sender, _patient),
            "Not authorized to view records"
        );
        return patientRecords[_patient];
    }

    function checkAccess(address _patient, address _doctor) public view returns (bool) {
        return accessControl[_patient][_doctor];
    }

    function getHospital(address _hospitalAddress) public view returns (Hospital memory) {
        return hospitals[_hospitalAddress];
    }

    function getRecordCount(address _patient) public view returns (uint256) {
        return patientRecords[_patient].length;
    }

    function _hasHospitalAccess(address _hospital, address _patient) private view returns (bool) {
        if (!hospitals[_hospital].isRegistered) return false;
        MedicalRecord[] memory records = patientRecords[_patient];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].hospital == _hospital) return true;
        }
        return false;
    }
}
```

- [ ] **Step 2: Compile the contract**

```bash
cd blockchain
npx hardhat compile
```

Expected: Compilation successful

- [ ] **Step 3: Commit**

```bash
git add blockchain/contracts/
git commit -m "feat: add MediLedger smart contract"
```

### Task 3: Write Smart Contract Tests

**Files:**
- Create: `blockchain/test/MediLedger.test.js`

- [ ] **Step 1: Write comprehensive tests**

Tests should cover:
- Deployment and owner assignment
- Hospital registration (success + duplicate rejection + non-owner rejection)
- Adding medical records (success + non-hospital rejection)
- Granting access (success + duplicate grant rejection)
- Revoking access (success + non-granted rejection)
- Getting patient records (as patient, as doctor, as hospital, unauthorized rejection)

- [ ] **Step 2: Run tests**

```bash
cd blockchain
npx hardhat test
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add blockchain/test/
git commit -m "test: add MediLedger contract tests"
```

### Task 4: Create Deployment Script

**Files:**
- Create: `blockchain/scripts/deploy.js`

- [ ] **Step 1: Write deployment script**

Script should:
- Deploy MediLedger contract
- Log deployed address
- Save ABI and address to `blockchain/deployments/localhost.json`

- [ ] **Step 2: Start Hardhat node and deploy**

```bash
cd blockchain
npx hardhat node &
npx hardhat run scripts/deploy.js --network localhost
```

Expected: Contract deployed, address saved

- [ ] **Step 3: Commit**

```bash
git add blockchain/scripts/ blockchain/deployments/
git commit -m "feat: add deployment script with artifact export"
```

## Chunk 2: Backend

### Task 5: Initialize Backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/server.js`
- Create: `backend/routes/ipfs.js`
- Create: `backend/routes/contracts.js`
- Create: `backend/services/ipfsService.js`

- [ ] **Step 1: Initialize Node.js project**

```bash
mkdir -p backend
cd backend
npm init -y
npm install express cors multer crypto
```

- [ ] **Step 2: Create IPFS simulation service**

`backend/services/ipfsService.js` should:
- Accept file buffer, compute SHA-256 hash
- Save file to `backend/uploads/{hash}.{ext}`
- Return hash as CID
- Retrieve file by hash

- [ ] **Step 3: Create IPFS routes**

`backend/routes/ipfs.js` should:
- `POST /upload` - Accept multipart file, store via ipfsService, return hash
- `GET /:hash` - Retrieve and serve file by hash

- [ ] **Step 4: Create contracts info route**

`backend/routes/contracts.js` should:
- `GET /info` - Read and return ABI + address from `blockchain/deployments/localhost.json`

- [ ] **Step 5: Create Express server**

`backend/server.js` should:
- Set up Express with CORS and JSON middleware
- Mount routes at `/api/ipfs` and `/api/contracts`
- Listen on port 5000

- [ ] **Step 6: Test backend manually**

```bash
cd backend
node server.js &
curl -X POST http://localhost:5000/api/ipfs/upload -F "file=@test.txt"
curl http://localhost:5000/api/contracts/info
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add backend with IPFS simulation and contract info API"
```

## Chunk 3: Frontend

### Task 6: Initialize React Frontend

**Files:**
- Create: `frontend/` (via create-react-app or vite)

- [ ] **Step 1: Create React app**

```bash
npx create-react-app frontend
cd frontend
npm install ethers react-router-dom axios
```

- [ ] **Step 2: Commit**

```bash
git add frontend/
git commit -m "chore: initialize React frontend"
```

### Task 7: Build Core Frontend Components

**Files:**
- Create: `frontend/src/context/Web3Context.js` - MetaMask connection and contract instance
- Create: `frontend/src/components/Navbar.js` - Navigation with wallet status
- Create: `frontend/src/pages/Home.js` - Landing page with role selection
- Create: `frontend/src/pages/HospitalDashboard.js` - Hospital features
- Create: `frontend/src/pages/PatientDashboard.js` - Patient features
- Create: `frontend/src/pages/DoctorDashboard.js` - Doctor features
- Modify: `frontend/src/App.js` - Router setup
- Modify: `frontend/src/App.css` - Global styles

- [ ] **Step 1: Create Web3Context**

Should provide:
- `account` - connected wallet address
- `contract` - ethers.js contract instance
- `connectWallet()` - MetaMask connection function
- `isOwner` - whether connected account is contract owner

- [ ] **Step 2: Create Navbar component**

Display: app name, wallet address (truncated), connect button, navigation links

- [ ] **Step 3: Create Home page**

Landing page with:
- App description
- Connect wallet button
- Role selection cards (Hospital, Patient, Doctor)
- Route to appropriate dashboard

- [ ] **Step 4: Create Hospital Dashboard**

Sections:
- Register Hospital form (name, location) - owner only
- Upload Record form (patient address, file upload, record type, description)
- List of records uploaded by this hospital

- [ ] **Step 5: Create Patient Dashboard**

Sections:
- View all personal medical records with download links
- Grant access form (doctor address input)
- Revoke access form (doctor address input)
- Access log/status display

- [ ] **Step 6: Create Doctor Dashboard**

Sections:
- Input patient address to view records
- Display authorized patient records with download links
- Access status indicator

- [ ] **Step 7: Set up App.js with routing**

Routes:
- `/` → Home
- `/hospital` → HospitalDashboard
- `/patient` → PatientDashboard
- `/doctor` → DoctorDashboard

- [ ] **Step 8: Add CSS styling**

Professional medical-themed styling with:
- Clean layout, card-based sections
- Status indicators (connected/disconnected)
- Responsive design
- Form styling

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat: add complete frontend with dashboards and MetaMask integration"
```

## Chunk 4: Integration and Testing

### Task 8: Integration and End-to-End Testing

- [ ] **Step 1: Create startup script**

Create `start.sh` in project root that:
1. Starts Hardhat node
2. Deploys contract
3. Starts backend
4. Starts frontend

- [ ] **Step 2: Create README.md with setup instructions**

- [ ] **Step 3: Full integration test**

Manual test workflow:
1. Start all services
2. Connect MetaMask to localhost:8545
3. Register a hospital (as owner)
4. Upload a medical record (as hospital)
5. View records (as patient)
6. Grant access to doctor (as patient)
7. View records (as doctor)
8. Revoke access (as patient)
9. Verify doctor can no longer view records

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: add startup script and README"
```
