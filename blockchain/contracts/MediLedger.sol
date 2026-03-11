// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MediLedger {
    address public owner;
    uint256 private recordCounter;
    uint256 private hospitalCount;

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

    // Track all registered hospital addresses
    address[] private hospitalAddresses;

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

    /**
     * @dev Register a hospital on the platform. Only the contract owner can do this.
     * @param _hospitalAddress The wallet address of the hospital
     * @param _name The name of the hospital
     * @param _location The location of the hospital
     */
    function registerHospital(
        address _hospitalAddress,
        string memory _name,
        string memory _location
    ) public onlyOwner {
        require(!hospitals[_hospitalAddress].isRegistered, "Hospital already registered");
        require(_hospitalAddress != address(0), "Invalid hospital address");

        hospitalCount++;
        hospitals[_hospitalAddress] = Hospital(
            hospitalCount,
            _name,
            _location,
            _hospitalAddress,
            true
        );
        hospitalAddresses.push(_hospitalAddress);

        emit HospitalRegistered(_hospitalAddress, _name);
    }

    /**
     * @dev Add a medical record for a patient. Only registered hospitals can call this.
     * @param _patient The patient's wallet address
     * @param _ipfsHash The IPFS hash of the medical record file
     * @param _recordType The type of record (e.g., "Lab Report", "Prescription")
     * @param _description A brief description of the record
     */
    function addMedicalRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _recordType,
        string memory _description
    ) public onlyRegisteredHospital {
        require(_patient != address(0), "Invalid patient address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

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

    /**
     * @dev Grant a doctor access to the caller's medical records.
     * @param _doctor The doctor's wallet address
     */
    function grantAccess(address _doctor) public {
        require(_doctor != address(0), "Invalid doctor address");
        require(!accessControl[msg.sender][_doctor], "Access already granted");

        accessControl[msg.sender][_doctor] = true;

        emit AccessGranted(msg.sender, _doctor);
    }

    /**
     * @dev Revoke a doctor's access to the caller's medical records.
     * @param _doctor The doctor's wallet address
     */
    function revokeAccess(address _doctor) public {
        require(accessControl[msg.sender][_doctor], "Access not granted");

        accessControl[msg.sender][_doctor] = false;

        emit AccessRevoked(msg.sender, _doctor);
    }

    /**
     * @dev Get all medical records for a patient. Caller must be authorized.
     * @param _patient The patient's wallet address
     * @return Array of MedicalRecord structs
     */
    function getPatientRecords(address _patient) public view returns (MedicalRecord[] memory) {
        require(
            msg.sender == _patient ||
            accessControl[_patient][msg.sender] ||
            _hasHospitalAccess(msg.sender, _patient),
            "Not authorized to view records"
        );
        return patientRecords[_patient];
    }

    /**
     * @dev Check if a doctor has access to a patient's records.
     * @param _patient The patient's wallet address
     * @param _doctor The doctor's wallet address
     * @return True if the doctor has access
     */
    function checkAccess(address _patient, address _doctor) public view returns (bool) {
        return accessControl[_patient][_doctor];
    }

    /**
     * @dev Get hospital details by address.
     * @param _hospitalAddress The hospital's wallet address
     * @return Hospital struct
     */
    function getHospital(address _hospitalAddress) public view returns (Hospital memory) {
        return hospitals[_hospitalAddress];
    }

    /**
     * @dev Get the number of records for a patient.
     * @param _patient The patient's wallet address
     * @return Number of records
     */
    function getRecordCount(address _patient) public view returns (uint256) {
        return patientRecords[_patient].length;
    }

    /**
     * @dev Get all registered hospital addresses.
     * @return Array of hospital addresses
     */
    function getHospitalAddresses() public view returns (address[] memory) {
        return hospitalAddresses;
    }

    /**
     * @dev Check if a hospital has uploaded records for a given patient.
     * @param _hospital The hospital's wallet address
     * @param _patient The patient's wallet address
     * @return True if the hospital has at least one record for the patient
     */
    function _hasHospitalAccess(address _hospital, address _patient) private view returns (bool) {
        if (!hospitals[_hospital].isRegistered) return false;
        MedicalRecord[] memory records = patientRecords[_patient];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].hospital == _hospital) return true;
        }
        return false;
    }
}
