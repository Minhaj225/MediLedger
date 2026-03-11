const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/**
 * GET /api/contracts/info
 * Return the deployed contract ABI and address
 */
router.get("/info", (req, res) => {
  try {
    const deploymentPath = path.join(
      __dirname,
      "../../blockchain/deployments/localhost.json"
    );

    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({
        error: "Contract not deployed yet. Run the deployment script first.",
      });
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    res.json({
      contractAddress: deployment.contractAddress,
      abi: deployment.abi,
      network: deployment.network,
      deployedAt: deployment.deployedAt,
    });
  } catch (error) {
    console.error("Contract info error:", error);
    res.status(500).json({ error: "Failed to read contract info" });
  }
});

module.exports = router;
