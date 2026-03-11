const express = require("express");
const cors = require("cors");
const path = require("path");

const ipfsRoutes = require("./routes/ipfs");
const contractRoutes = require("./routes/contracts");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/ipfs", ipfsRoutes);
app.use("/api/contracts", contractRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`MediLedger backend running on port ${PORT}`);
  console.log(`IPFS upload: POST http://localhost:${PORT}/api/ipfs/upload`);
  console.log(`Contract info: GET http://localhost:${PORT}/api/contracts/info`);
});

module.exports = app;
