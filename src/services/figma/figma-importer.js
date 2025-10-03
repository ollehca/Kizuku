/**
 * Figma Importer Service
 * Main orchestrator for importing Figma files into Kizu
 *
 * Supports three import methods:
 * 1. Local .fig file (using plugin logic)
 * 2. Pre-exported .penpot/.zip file
 * 3. Figma URL (using REST API) - Phase 2
 */

const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../../utils/logger');
const { getBackendServiceManager } = require('../backend-service-manager');
const EventEmitter = require('events');

const logger = createLogger('FigmaImporter');

/**
 * Import status enum
 */
const ImportStatus = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  PARSING: 'parsing',
  CONVERTING: 'converting',
  IMPORTING: 'importing',
  COMPLETE: 'complete',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

/**
 * FigmaImporter class
 * Handles all Figma import operations
 */
class FigmaImporter extends EventEmitter {
  constructor() {
    super();
    this.status = ImportStatus.IDLE;
    this.progress = {
      currentItem: null,
      totalItems: 0,
      processedItems: 0,
      percentage: 0,
    };
    this.currentImport = null;
    this.cancelled = false;
  }

  /**
   * Import from local .fig file
   * @param {string} filePath - Path to .fig file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async importFromFile(filePath, options = {}) {
    logger.info('Starting import from .fig file', { filePath });

    try {
      this.status = ImportStatus.VALIDATING;
      this.emit('status-change', this.status);

      // Validate file exists and is readable
      await this.validateFile(filePath);

      // For Phase 1, we'll use pre-exported .penpot files
      // Phase 3 will add direct .fig parsing
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.penpot' || ext === '.zip') {
        return await this.importFromPenpotFile(filePath, options);
      } else if (ext === '.fig') {
        // Phase 1: Inform user to use Figma plugin first
        // Phase 3: Will add direct .fig parser
        throw new Error(
          'Direct .fig import coming in Phase 3. ' +
            'For now, please export from Figma using: File > Export > .penpot'
        );
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      this.status = ImportStatus.ERROR;
      this.emit('status-change', this.status);
      this.emit('error', error);
      logger.error('Import failed', { filePath, error });
      throw error;
    }
  }

  /**
   * Import from pre-exported .penpot file
   * @param {string} filePath - Path to .penpot/.zip file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async importFromPenpotFile(filePath, _options = {}) {
    logger.info('Importing from .penpot file', { filePath });

    try {
      this.status = ImportStatus.PARSING;
      this.emit('status-change', this.status);

      // Read file
      const fileBuffer = await fs.readFile(filePath);

      this.status = ImportStatus.IMPORTING;
      this.emit('status-change', this.status);

      // Use backend service manager to load the project
      const backend = getBackendServiceManager();

      // Create temp file for backend to process
      const tempPath = path.join(require('os').tmpdir(), `kizu-import-${Date.now()}.penpot`);

      await fs.writeFile(tempPath, fileBuffer);

      // Load project (backend handles .penpot import)
      const project = await backend.loadProject(tempPath);

      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {
        /* ignore cleanup errors */
      });

      // Update progress
      this.progress.processedItems = this.progress.totalItems;
      this.progress.percentage = 100;
      this.emit('progress', this.progress);

      this.status = ImportStatus.COMPLETE;
      this.emit('status-change', this.status);

      const result = {
        success: true,
        project,
        filePath,
        compatibilityScore: 100, // TODO: Calculate based on feature support
        warnings: [],
        errors: [],
      };

      logger.info('Import completed successfully', { filePath });
      this.emit('complete', result);

      return result;
    } catch (error) {
      this.status = ImportStatus.ERROR;
      this.emit('status-change', this.status);
      throw error;
    }
  }

  /**
   * Validate file before import
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} Validation result
   */
  async validateFile(filePath) {
    logger.info('Validating file', { filePath });

    // Check file exists
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // Check file size
      const maxSize = this.getMaxFileSize();
      if (stats.size > maxSize) {
        throw new Error(
          `File too large: ${this.formatFileSize(stats.size)}. ` +
            `Maximum: ${this.formatFileSize(maxSize)}`
        );
      }

      // Check extension
      const ext = path.extname(filePath).toLowerCase();
      const validExtensions = ['.fig', '.penpot', '.zip'];

      if (!validExtensions.includes(ext)) {
        throw new Error(`Invalid file type: ${ext}. Expected: ${validExtensions.join(', ')}`);
      }

      return {
        valid: true,
        size: stats.size,
        ext,
      };
    } catch (error) {
      logger.error('File validation failed', { filePath, error });
      throw error;
    }
  }

  /**
   * Get maximum file size based on license tier
   * @returns {number} Max file size in bytes
   */
  getMaxFileSize() {
    const backend = getBackendServiceManager();

    // Get license type from config
    const licenseType = backend.getConfigValue('licenseType') || 'starter';

    const limits = {
      starter: 50 * 1024 * 1024, // 50MB
      professional: 500 * 1024 * 1024, // 500MB
      master: 5 * 1024 * 1024 * 1024, // 5GB
      private: 500 * 1024 * 1024, // 500MB (demo)
    };

    return limits[licenseType] || limits.starter;
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Cancel current import
   */
  cancel() {
    if (this.status !== ImportStatus.IDLE && this.status !== ImportStatus.COMPLETE) {
      this.cancelled = true;
      this.status = ImportStatus.CANCELLED;
      this.emit('status-change', this.status);
      this.emit('cancelled');
      logger.info('Import cancelled by user');
    }
  }

  /**
   * Reset importer state
   */
  reset() {
    this.status = ImportStatus.IDLE;
    this.progress = {
      currentItem: null,
      totalItems: 0,
      processedItems: 0,
      percentage: 0,
    };
    this.currentImport = null;
    this.cancelled = false;
  }

  /**
   * Get current import status
   * @returns {object} Status object
   */
  getStatus() {
    return {
      status: this.status,
      progress: { ...this.progress },
      cancelled: this.cancelled,
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get FigmaImporter instance
 * @returns {FigmaImporter} Singleton instance
 */
function getFigmaImporter() {
  if (!instance) {
    instance = new FigmaImporter();
  }
  return instance;
}

module.exports = {
  FigmaImporter,
  getFigmaImporter,
  ImportStatus,
};
