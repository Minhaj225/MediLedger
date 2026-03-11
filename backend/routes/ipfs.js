const express = require("express");
const multer = require("multer");
const { storeFile, getFile } = require("../services/ipfsService");

const router = express.Router();

// Configure multer for memory storage (we handle file storage ourselves)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * POST /api/ipfs/upload
 * Upload a file and return its simulated IPFS hash (CID)
 */
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const result = storeFile(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      hash: result.hash,
      filename: result.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

/**
 * GET /api/ipfs/:hash
 * Retrieve a file by its hash
 */
router.get("/:hash", (req, res) => {
  try {
    const file = getFile(req.params.hash);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(file.filePath);
  } catch (error) {
    console.error("Retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve file" });
  }
});

module.exports = router;
