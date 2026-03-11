import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initContract = useCallback(async (signerInstance) => {
    try {
      const response = await axios.get("http://localhost:5000/api/contracts/info");
      const { contractAddress, abi } = response.data;

      const contractInstance = new ethers.Contract(
        contractAddress,
        abi,
        signerInstance
      );
      setContract(contractInstance);

      // Check if connected account is the contract owner
      const ownerAddress = await contractInstance.owner();
      const signerAddress = await signerInstance.getAddress();
      setIsOwner(ownerAddress.toLowerCase() === signerAddress.toLowerCase());

      return contractInstance;
    } catch (err) {
      console.error("Failed to initialize contract:", err);
      setError("Failed to connect to smart contract. Is the backend running?");
      return null;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signerInstance = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAccount(accounts[0]);

      await initContract(signerInstance);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError("Failed to connect wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [initContract]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setContract(null);
          setIsOwner(false);
        } else {
          setAccount(accounts[0]);
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [connectWallet]);

  const value = {
    account,
    contract,
    provider,
    signer,
    isOwner,
    loading,
    error,
    connectWallet,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
