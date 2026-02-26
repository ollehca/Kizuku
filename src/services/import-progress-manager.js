/**
 * Import Progress Manager
 * Manages a modal BrowserWindow that shows import progress.
 * Uses src/ui/import-progress.html as the UI.
 */

const path = require('node:path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ImportProgress');

/** Singleton progress manager instance */
let instance = null;

/**
 * ImportProgressManager class
 * Shows and controls a modal progress window during file imports.
 */
class ImportProgressManager {
  window = null;
  parentWindow = null;

  constructor() {}

  /**
   * Show progress window for a file import
   * @param {string} fileName - Name of file being imported
   * @param {object} parentWindow - Parent BrowserWindow
   */
  show(fileName, parentWindow) {
    this.parentWindow = parentWindow;
    this.createWindow(parentWindow);
    this.sendUpdate({ fileName, percentage: 0, status: 'Starting import...' });
    logger.info('Progress window shown', { fileName });
  }

  /**
   * Create the modal BrowserWindow
   * @param {object} parentWindow - Parent BrowserWindow
   */
  createWindow(parentWindow) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    const { BrowserWindow } = require('electron');
    this.window = new BrowserWindow({
      width: 420,
      height: 380,
      parent: parentWindow,
      modal: true,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      backgroundColor: '#1e1e1e',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const htmlPath = path.join(__dirname, '..', 'ui', 'import-progress.html');
    this.window.loadFile(htmlPath);
    this.window.once('ready-to-show', () => this.window.show());
    this.window.on('closed', () => {
      this.window = null;
    });
  }

  /**
   * Send a progress update to the window
   * @param {object} data - Progress data object
   */
  sendUpdate(data) {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }
    this.window.webContents.send('import-progress', data);
  }

  /**
   * Update progress from importer status
   * @param {string} status - Import status string
   * @param {number} percentage - Progress percentage (0-100)
   */
  updateProgress(status, percentage) {
    const statusMessages = {
      validating: 'Validating file...',
      parsing: 'Parsing Figma format...',
      converting: 'Converting to Kizuku format...',
      importing: 'Preparing workspace...',
    };
    this.sendUpdate({
      status: statusMessages[status] || status,
      percentage: percentage || this.estimatePercentage(status),
    });
  }

  /**
   * Estimate percentage from import status
   * @param {string} status - Import status
   * @returns {number} Estimated percentage
   */
  estimatePercentage(status) {
    const estimates = {
      validating: 5,
      parsing: 25,
      converting: 60,
      importing: 85,
      complete: 100,
    };
    return estimates[status] || 0;
  }

  /**
   * Show success state with project details
   * @param {object} result - Import result object
   */
  showSuccess(result) {
    const details = this.buildSuccessDetails(result);
    this.sendUpdate({
      percentage: 100,
      success: true,
      status: 'Import complete!',
      details,
      filePath: result.filePath,
      projectId: result.project?.metadata?.id,
      teamId: result.project?.metadata?.teamId,
    });
    logger.info('Import success shown');
  }

  /**
   * Build success detail messages from result
   * @param {object} result - Import result
   * @returns {array} Detail strings
   */
  buildSuccessDetails(result) {
    const details = [];
    const stats = result.stats;
    if (stats) {
      details.push(`${stats.convertedNodes || 0} nodes converted`);
      if (stats.warnings?.length > 0) {
        details.push(`${stats.warnings.length} warnings`);
      }
    }
    if (result.compatibilityScore) {
      details.push(`Compatibility: ${result.compatibilityScore}%`);
    }
    return details;
  }

  /**
   * Show error state with user-friendly message
   * @param {string} message - Formatted error message
   */
  showError(message) {
    this.sendUpdate({
      error: message,
      percentage: 0,
    });
    logger.error('Import error shown', { message });
  }

  /**
   * Close the progress window
   */
  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}

/**
 * Get singleton ImportProgressManager instance
 * @returns {ImportProgressManager} Singleton instance
 */
function getImportProgressManager() {
  if (!instance) {
    instance = new ImportProgressManager();
  }
  return instance;
}

module.exports = {
  ImportProgressManager,
  getImportProgressManager,
};
