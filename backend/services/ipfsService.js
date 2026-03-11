const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Store a file and return its content-based hash (simulated IPFS CID)
 * @param {Buffer} fileBuffer - The file contents
 * @param {string} originalName - Original filename for extension
 * @returns {Object} { hash, filename }
 */
function storeFile(fileBuffer, originalName) {
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const ext = path.extname(originalName) || ".bin";
  const filename = `${hash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, fileBuffer);

  return { hash, filename, filePath };
}

/**
 * Retrieve a file by its hash
 * @param {string} hash - The SHA-256 hash of the file
 * @returns {Object|null} { filePath, filename } or null if not found
 */
function getFile(hash) {
  const files = fs.readdirSync(UPLOADS_DIR);
  const match = files.find((f) => f.startsWith(hash));

  if (!match) return null;

  return {
    filePath: path.join(UPLOADS_DIR, match),
    filename: match,
  };
}

/**
 * Check if a file exists by hash
 * @param {string} hash
 * @returns {boolean}
 */
function fileExists(hash) {
  return getFile(hash) !== null;
}

module.exports = { storeFile, getFile, fileExists };
