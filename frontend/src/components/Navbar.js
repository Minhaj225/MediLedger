import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

function Navbar() {
  const { account, connectWallet, loading, isOwner } = useWeb3();
  const location = useLocation();

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">+</span>
          MediLedger
        </Link>
      </div>

      <div className="navbar-links">
        <Link
          to="/hospital"
          className={`nav-link ${isActive("/hospital") ? "active" : ""}`}
        >
          Hospital
        </Link>
        <Link
          to="/patient"
          className={`nav-link ${isActive("/patient") ? "active" : ""}`}
        >
          Patient
        </Link>
        <Link
          to="/doctor"
          className={`nav-link ${isActive("/doctor") ? "active" : ""}`}
        >
          Doctor
        </Link>
      </div>

      <div className="navbar-wallet">
        {account ? (
          <div className="wallet-info">
            <span className="wallet-indicator connected"></span>
            <span className="wallet-address">{truncateAddress(account)}</span>
            {isOwner && <span className="owner-badge">Owner</span>}
          </div>
        ) : (
          <button
            className="btn btn-connect"
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
