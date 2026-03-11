import React, { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";

function PatientDashboard() {
  const { account, contract } = useWeb3();

  // Access control
  const [doctorAddress, setDoctorAddress] = useState("");
  const [revokeAddress, setRevokeAddress] = useState("");

  // State
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accessCheck, setAccessCheck] = useState({ address: "", hasAccess: null });

  const loadRecords = useCallback(async () => {
    if (!contract || !account) return;

    setIsLoading(true);
    try {
      const recs = await contract.getPatientRecords(account);
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
    } catch (err) {
      // If no records exist yet, this will fail gracefully
      if (err.reason && err.reason.includes("Not authorized")) {
        setRecords([]);
      } else {
        console.error("Error loading records:", err);
      }
    }
    setIsLoading(false);
  }, [contract, account]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const grantAccess = async (e) => {
    e.preventDefault();
    if (!contract) return setStatus("Please connect your wallet first.");

    setIsLoading(true);
    setStatus("Granting access...");
    try {
      const tx = await contract.grantAccess(doctorAddress);
      await tx.wait();
      setStatus(`Access granted to ${doctorAddress.slice(0, 8)}...`);
      setDoctorAddress("");
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  const revokeAccess = async (e) => {
    e.preventDefault();
    if (!contract) return setStatus("Please connect your wallet first.");

    setIsLoading(true);
    setStatus("Revoking access...");
    try {
      const tx = await contract.revokeAccess(revokeAddress);
      await tx.wait();
      setStatus(`Access revoked for ${revokeAddress.slice(0, 8)}...`);
      setRevokeAddress("");
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  const checkDoctorAccess = async () => {
    if (!contract || !accessCheck.address) return;

    try {
      const hasAccess = await contract.checkAccess(account, accessCheck.address);
      setAccessCheck((prev) => ({ ...prev, hasAccess }));
    } catch (err) {
      setStatus("Error checking access: " + err.message);
    }
  };

  if (!account) {
    return (
      <div className="dashboard">
        <h1>Patient Dashboard</h1>
        <p className="warning">Please connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Patient Dashboard</h1>
      <p className="account-info">Your address: <code>{account}</code></p>

      {status && <div className="status-message">{status}</div>}

      {/* Medical Records */}
      <div className="card">
        <div className="card-header">
          <h2>My Medical Records</h2>
          <button className="btn btn-secondary btn-sm" onClick={loadRecords} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {records.length === 0 ? (
          <p className="empty-state">No medical records found.</p>
        ) : (
          <div className="records-list">
            {records.map((rec) => (
              <div key={rec.id} className="record-item">
                <div className="record-header">
                  <span className="record-type">{rec.recordType}</span>
                  <span className="record-date">{rec.timestamp}</span>
                </div>
                <p className="record-description">{rec.description}</p>
                <p className="record-meta">
                  Hospital: <code>{rec.hospital.slice(0, 10)}...</code>
                </p>
                <p className="record-hash">
                  IPFS: <code>{rec.ipfsHash.slice(0, 16)}...</code>
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

      {/* Grant Access */}
      <div className="card">
        <h2>Grant Access to Doctor</h2>
        <p className="card-description">
          Allow a doctor to view your medical records by entering their wallet address.
        </p>
        <form onSubmit={grantAccess}>
          <div className="form-group inline">
            <input
              type="text"
              placeholder="Doctor's wallet address (0x...)"
              value={doctorAddress}
              onChange={(e) => setDoctorAddress(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Processing..." : "Grant Access"}
            </button>
          </div>
        </form>
      </div>

      {/* Revoke Access */}
      <div className="card">
        <h2>Revoke Doctor Access</h2>
        <p className="card-description">
          Remove a doctor's access to your medical records.
        </p>
        <form onSubmit={revokeAccess}>
          <div className="form-group inline">
            <input
              type="text"
              placeholder="Doctor's wallet address (0x...)"
              value={revokeAddress}
              onChange={(e) => setRevokeAddress(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-danger" disabled={isLoading}>
              {isLoading ? "Processing..." : "Revoke Access"}
            </button>
          </div>
        </form>
      </div>

      {/* Check Access */}
      <div className="card">
        <h2>Check Doctor Access</h2>
        <div className="form-group inline">
          <input
            type="text"
            placeholder="Doctor's wallet address (0x...)"
            value={accessCheck.address}
            onChange={(e) =>
              setAccessCheck({ address: e.target.value, hasAccess: null })
            }
          />
          <button
            className="btn btn-secondary"
            onClick={checkDoctorAccess}
            disabled={!accessCheck.address}
          >
            Check
          </button>
        </div>
        {accessCheck.hasAccess !== null && (
          <p className={`access-status ${accessCheck.hasAccess ? "granted" : "denied"}`}>
            {accessCheck.hasAccess
              ? "This doctor HAS access to your records."
              : "This doctor does NOT have access to your records."}
          </p>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;
