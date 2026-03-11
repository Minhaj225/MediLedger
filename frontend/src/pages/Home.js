import React from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

function Home() {
  const { account, connectWallet, loading, error } = useWeb3();

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">
          <span className="hero-icon">+</span> MediLedger
        </h1>
        <p className="hero-subtitle">
          Decentralized Medical Records on the Blockchain
        </p>
        <p className="hero-description">
          A secure platform where patients own their medical data. Hospitals
          upload records to the blockchain, and patients control who can access
          their health information.
        </p>

        {!account && (
          <div className="connect-section">
            <button
              className="btn btn-primary btn-lg"
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect MetaMask Wallet"}
            </button>
            {error && <p className="error-text">{error}</p>}
          </div>
        )}
      </div>

      {account && (
        <div className="role-selection">
          <h2>Select Your Role</h2>
          <div className="role-cards">
            <Link to="/hospital" className="role-card hospital-card">
              <div className="role-icon">🏥</div>
              <h3>Hospital</h3>
              <p>Register your hospital, upload patient records, and manage medical data on the blockchain.</p>
            </Link>

            <Link to="/patient" className="role-card patient-card">
              <div className="role-icon">👤</div>
              <h3>Patient</h3>
              <p>View your medical history, control access permissions, and share records securely.</p>
            </Link>

            <Link to="/doctor" className="role-card doctor-card">
              <div className="role-icon">⚕️</div>
              <h3>Doctor</h3>
              <p>View authorized patient records and access medical data shared with you.</p>
            </Link>
          </div>
        </div>
      )}

      <div className="features-section">
        <h2>How It Works</h2>
        <div className="features-grid">
          <div className="feature">
            <h3>Blockchain Security</h3>
            <p>All records are stored on Ethereum, ensuring immutability and transparency.</p>
          </div>
          <div className="feature">
            <h3>IPFS Storage</h3>
            <p>Medical files are stored on IPFS with content-addressable hashing.</p>
          </div>
          <div className="feature">
            <h3>Patient Ownership</h3>
            <p>Patients have full control over who can access their medical records.</p>
          </div>
          <div className="feature">
            <h3>Access Control</h3>
            <p>Grant and revoke access to doctors with a simple blockchain transaction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
