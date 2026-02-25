/**
 * Autosave service for Kizuku
 *
 * Periodically persists dirty files to the user data directory
 * so that edits are not silently lost for private-license users
 * who have no server backend.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_INTERVAL_MS = 300000; // 5 minutes

let autosaveTimer = null;
const dirtyFiles = new Set();
let fileDataProvider = null;

/**
 * Get the autosave directory under userData
 * @returns {string} Absolute path to projects dir
 */
function getAutosaveDir() {
  const dir = path.join(app.getPath('userData'), 'projects');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Set the callback that provides file data for a given ID
 * @param {Function} provider - (fileId) => object | null
 */
function setFileDataProvider(provider) {
  fileDataProvider = provider;
}

/**
 * Mark a file as having unsaved changes
 * @param {string} fileId - UUID of the dirty file
 */
function markDirty(fileId) {
  dirtyFiles.add(fileId);
}

/**
 * Flush all dirty files to disk
 */
function flushDirtyFiles() {
  if (dirtyFiles.size === 0 || !fileDataProvider) {
    return;
  }

  const dir = getAutosaveDir();

  for (const fileId of dirtyFiles) {
    const data = fileDataProvider(fileId);
    if (!data) {
      continue;
    }
    try {
      const filePath = path.join(dir, `${fileId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data));
      console.log(`💾 Autosaved file: ${fileId}`);
    } catch (err) {
      console.warn(`Autosave failed for ${fileId}:`, err.message);
    }
  }

  dirtyFiles.clear();
}

/**
 * Start the autosave timer
 * @param {number} intervalMs - Interval between saves
 */
function startAutosave(intervalMs = DEFAULT_INTERVAL_MS) {
  if (autosaveTimer) {
    return;
  }
  autosaveTimer = setInterval(flushDirtyFiles, intervalMs);
  console.log(`⏱️ Autosave started (${intervalMs / 1000}s interval)`);
}

/**
 * Stop the autosave timer and flush remaining changes
 */
function stopAutosave() {
  if (!autosaveTimer) {
    return;
  }
  clearInterval(autosaveTimer);
  autosaveTimer = null;
  flushDirtyFiles();
  console.log('⏱️ Autosave stopped');
}

/**
 * Check whether autosave is currently active
 * @returns {boolean} True if timer is running
 */
function isAutosaving() {
  return autosaveTimer !== null;
}

/**
 * Load a previously autosaved file by ID
 * @param {string} fileId - UUID of the file
 * @returns {object|null} Parsed file data or null
 */
function loadAutosavedFile(fileId) {
  try {
    const filePath = path.join(getAutosaveDir(), `${fileId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Failed to load autosave for ${fileId}:`, err.message);
  }
  return null;
}

/**
 * Load all autosaved files from the projects directory
 * @returns {Array<object>} Array of { id, data } objects
 */
function loadAllAutosavedFiles() {
  const results = [];
  try {
    const dir = getAutosaveDir();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const fileName of files) {
      const fileId = fileName.replace('.json', '');
      const data = loadAutosavedFile(fileId);
      if (data) {
        results.push({ id: fileId, data });
      }
    }
  } catch (err) {
    console.warn('Failed to list autosaved files:', err.message);
  }
  return results;
}

/**
 * Immediately persist a file to the autosave directory
 * @param {string} fileId - UUID of the file
 * @param {object} data - File data to persist
 */
function persistFileNow(fileId, data) {
  try {
    const dir = getAutosaveDir();
    const filePath = path.join(dir, `${fileId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`💾 Persisted file immediately: ${fileId}`);
  } catch (err) {
    console.warn(`Failed to persist ${fileId}:`, err.message);
  }
}

module.exports = {
  setFileDataProvider,
  markDirty,
  persistFileNow,
  startAutosave,
  stopAutosave,
  isAutosaving,
  loadAutosavedFile,
  loadAllAutosavedFiles,
};
