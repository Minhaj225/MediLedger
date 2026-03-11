import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";

function DoctorDashboard() {
  const { account, contract } = useWeb3();

  const [patientAddress, setPatientAddress] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);

  const checkAccessAndViewRecords = async (e) => {
    e.preventDefault();
    if (!contract || !patientAddress) return;

    setIsLoading(true);
    setStatus("");
    setRecords([]);

    try {
      // First check if we have access
      const access = await contract.checkAccess(patientAddress, account);
      setHasAccess(access);

      if (!access) {
        setStatus("You do not have access to this patient's records. Ask the patient to grant you access.");
        setIsLoading(false);
        return;
      }

      // Fetch records
      const recs = await contract.getPatientRecords(patientAddress);
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
      setStatus(`Found ${recs.length} record(s) for this patient.`);
    } catch (err) {
      if (err.reason && err.reason.includes("Not authorized")) {
        setStatus("You are not authorized to view this patient's records.");
        setHasAccess(false);
      } else {
        setStatus("Error: " + (err.reason || err.message));
      }
    }
    setIsLoading(false);
  };

  if (!account) {
    return (
      <div className="dashboard">
        <h1>Doctor Dashboard</h1>
        <p className="warning">Please connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Doctor Dashboard</h1>
      <p className="account-info">Your address: <code>{account}</code></p>

      {status && <div className="status-message">{status}</div>}

      {/* View Patient Records */}
      <div className="card">
        <h2>View Patient Records</h2>
        <p className="card-description">
          Enter a patient's wallet address to view their records. The patient
          must have granted you access first.
        </p>
        <form onSubmit={checkAccessAndViewRecords}>
          <div className="form-group inline">
            <input
              type="text"
              placeholder="Patient's wallet address (0x...)"
              value={patientAddress}
              onChange={(e) => {
                setPatientAddress(e.target.value);
                setHasAccess(null);
                setRecords([]);
              }}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Loading..." : "View Records"}
            </button>
          </div>
        </form>

        {hasAccess !== null && (
          <div className={`access-badge ${hasAccess ? "access-granted" : "access-denied"}`}>
            {hasAccess ? "Access Granted" : "Access Denied"}
          </div>
        )}
      </div>

      {/* Records Display */}
      {records.length > 0 && (
        <div className="card">
          <h2>Patient Medical Records</h2>
          <div className="records-list">
            {records.map((rec) => (
              <div key={rec.id} className="record-item">
                <div className="record-header">
                  <span className="record-type">{rec.recordType}</span>
                  <span className="record-date">{rec.timestamp}</span>
                </div>
                <p className="record-description">{rec.description}</p>
                <div className="record-details">
                  <p className="record-meta">
                    Hospital: <code>{rec.hospital.slice(0, 10)}...</code>
                  </p>
                  <p className="record-hash">
                    IPFS: <code>{rec.ipfsHash.slice(0, 16)}...</code>
                  </p>
                </div>
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
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <h2>How to Request Access</h2>
        <div className="instructions">
          <ol>
            <li>Share your wallet address (<code>{account}</code>) with the patient.</li>
            <li>Ask the patient to go to their Patient Dashboard.</li>
            <li>The patient enters your address in the "Grant Access" section.</li>
            <li>Once the transaction is confirmed, you can view their records here.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;
