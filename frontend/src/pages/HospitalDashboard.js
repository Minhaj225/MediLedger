import React, { useState, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import axios from "axios";

function HospitalDashboard() {
  const { account, contract, isOwner } = useWeb3();

  // Registration form
  const [hospAddress, setHospAddress] = useState("");
  const [hospName, setHospName] = useState("");
  const [hospLocation, setHospLocation] = useState("");

  // Upload form
  const [patientAddr, setPatientAddr] = useState("");
  const [file, setFile] = useState(null);
  const [recordType, setRecordType] = useState("Lab Report");
  const [description, setDescription] = useState("");

  // State
  const [status, setStatus] = useState("");
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const registerHospital = async (e) => {
    e.preventDefault();
    if (!contract) return setStatus("Please connect your wallet first.");

    setIsLoading(true);
    setStatus("Registering hospital...");
    try {
      const tx = await contract.registerHospital(hospAddress, hospName, hospLocation);
      await tx.wait();
      setStatus(`Hospital "${hospName}" registered successfully!`);
      setHospAddress("");
      setHospName("");
      setHospLocation("");
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  const checkHospitalStatus = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const info = await contract.getHospital(account);
      if (info.isRegistered) {
        setHospitalInfo({
          name: info.name,
          location: info.location,
          id: info.id.toString(),
        });
      }
    } catch (err) {
      console.error("Error checking hospital status:", err);
    }
  }, [contract, account]);

  React.useEffect(() => {
    checkHospitalStatus();
  }, [checkHospitalStatus]);

  const uploadRecord = async (e) => {
    e.preventDefault();
    if (!contract) return setStatus("Please connect your wallet first.");
    if (!file) return setStatus("Please select a file to upload.");

    setIsLoading(true);
    setStatus("Uploading file to IPFS...");

    try {
      // Upload file to IPFS (backend)
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await axios.post(
        "http://localhost:5000/api/ipfs/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const ipfsHash = uploadRes.data.hash;
      setStatus("File uploaded. Saving record to blockchain...");

      // Save record on blockchain
      const tx = await contract.addMedicalRecord(
        patientAddr,
        ipfsHash,
        recordType,
        description
      );
      await tx.wait();

      setStatus("Medical record uploaded successfully!");
      setPatientAddr("");
      setFile(null);
      setDescription("");
      // Reset file input
      const fileInput = document.getElementById("record-file");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  const viewPatientRecords = async () => {
    if (!contract || !patientAddr) return;

    setIsLoading(true);
    try {
      const recs = await contract.getPatientRecords(patientAddr);
      setRecords(
        recs.map((r) => ({
          id: r.id.toString(),
          patient: r.patient,
          hospital: r.hospital,
          ipfsHash: r.ipfsHash,
          recordType: r.recordType,
          description: r.description,
          timestamp: new Date(Number(r.timestamp) * 1000).toLocaleString(),
        }))
      );
      setStatus(`Found ${recs.length} record(s).`);
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  if (!account) {
    return (
      <div className="dashboard">
        <h1>Hospital Dashboard</h1>
        <p className="warning">Please connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Hospital Dashboard</h1>

      {hospitalInfo && (
        <div className="info-card">
          <h3>Your Hospital</h3>
          <p><strong>Name:</strong> {hospitalInfo.name}</p>
          <p><strong>Location:</strong> {hospitalInfo.location}</p>
          <p><strong>ID:</strong> #{hospitalInfo.id}</p>
        </div>
      )}

      {status && <div className="status-message">{status}</div>}

      {/* Hospital Registration - Owner Only */}
      {isOwner && (
        <div className="card">
          <h2>Register a Hospital</h2>
          <p className="card-description">As the platform owner, you can register new hospitals.</p>
          <form onSubmit={registerHospital}>
            <div className="form-group">
              <label>Hospital Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={hospAddress}
                onChange={(e) => setHospAddress(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Hospital Name</label>
              <input
                type="text"
                placeholder="City General Hospital"
                value={hospName}
                onChange={(e) => setHospName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="New York, NY"
                value={hospLocation}
                onChange={(e) => setHospLocation(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Processing..." : "Register Hospital"}
            </button>
          </form>
        </div>
      )}

      {/* Upload Medical Record */}
      {hospitalInfo && (
        <div className="card">
          <h2>Upload Medical Record</h2>
          <form onSubmit={uploadRecord}>
            <div className="form-group">
              <label>Patient Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={patientAddr}
                onChange={(e) => setPatientAddr(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Medical File</label>
              <input
                type="file"
                id="record-file"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>
            <div className="form-group">
              <label>Record Type</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
              >
                <option>Lab Report</option>
                <option>X-Ray</option>
                <option>MRI Scan</option>
                <option>Prescription</option>
                <option>Discharge Summary</option>
                <option>Consultation Notes</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Brief description of the medical record..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Uploading..." : "Upload Record"}
            </button>
          </form>
        </div>
      )}

      {/* View Patient Records */}
      {hospitalInfo && (
        <div className="card">
          <h2>View Patient Records</h2>
          <div className="form-group inline">
            <input
              type="text"
              placeholder="Patient address (0x...)"
              value={patientAddr}
              onChange={(e) => setPatientAddr(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              onClick={viewPatientRecords}
              disabled={isLoading || !patientAddr}
            >
              View Records
            </button>
          </div>

          {records.length > 0 && (
            <div className="records-list">
              {records.map((rec) => (
                <div key={rec.id} className="record-item">
                  <div className="record-header">
                    <span className="record-type">{rec.recordType}</span>
                    <span className="record-date">{rec.timestamp}</span>
                  </div>
                  <p className="record-description">{rec.description}</p>
                  <p className="record-hash">
                    IPFS: {rec.ipfsHash.slice(0, 16)}...
                  </p>
                  <a
                    href={`http://localhost:5000/api/ipfs/${rec.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                  >
                    Download File
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HospitalDashboard;
