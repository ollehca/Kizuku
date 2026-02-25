/**
 * Figma Importer Service
 * Main orchestrator for importing Figma files into Kizuku
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
const { getFigmaJSONConverter } = require('./figma-json-converter');
const { getFigFileParser } = require('./fig-file-parser');
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
    logger.info('Starting import from file', { filePath });

    try {
      this.status = ImportStatus.VALIDATING;
      this.emit('status-change', this.status);

      // Validate file exists and is readable
      await this.validateFile(filePath);

      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.kizuku') {
        return await this.importFromKizukuFile(filePath, options);
      } else if (ext === '.json') {
        return await this.importFromFigmaJSON(filePath, options);
      } else if (ext === '.fig') {
        return await this.importFromFigFile(filePath, options);
      } else {
        throw new Error(`Unsupported file type: ${ext}. Supported: .kizuku, .json, .fig`);
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
   * Import from .kizuku file
   * @param {string} filePath - Path to .kizuku file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async importFromKizukuFile(filePath, _options = {}) {
    logger.info('Importing from .kizuku file', { filePath });

    try {
      this.status = ImportStatus.PARSING;
      this.emit('status-change', this.status);

      // Load project directly
      const backend = getBackendServiceManager();
      const project = await backend.loadProject(filePath);

      this.status = ImportStatus.COMPLETE;
      this.emit('status-change', this.status);

      const result = {
        success: true,
        project,
        filePath,
        compatibilityScore: 100,
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
   * Import from binary .fig file
   * @param {string} filePath - Path to .fig file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async importFromFigFile(filePath, options = {}) {
    logger.info('Importing from binary .fig file', { filePath });

    try {
      this.status = ImportStatus.PARSING;
      this.emit('status-change', this.status);

      // Parse binary .fig file to Figma JSON
      const parser = getFigFileParser();

      this.emit('status-update', 'Parsing binary .fig format...');
      const figmaData = await parser.parse(filePath);

      // Now convert the Figma JSON to .kizuku format
      // (reuse the existing conversion logic)
      return await this.convertAndSaveFigmaData(figmaData, filePath, options);
    } catch (error) {
      // If binary parsing fails, show helpful error
      logger.error('Binary .fig import failed', { filePath, error });

      this.status = ImportStatus.ERROR;
      this.emit('status-change', this.status);

      // Provide fallback instructions
      const errorMessage =
        `Failed to parse binary .fig file: ${error.message}\n\n` +
        'Alternative options:\n' +
        '1. Export from Figma using the PenPot Exporter plugin\n' +
        '2. Use Figma REST API to export as JSON\n' +
        '3. Try a newer version of the file';

      throw new Error(errorMessage);
    }
  }

  /**
   * Import from Figma JSON file (from REST API export)
   * @param {string} filePath - Path to Figma JSON file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async importFromFigmaJSON(filePath, options = {}) {
    logger.info('Importing from Figma JSON', { filePath });

    try {
      this.status = ImportStatus.PARSING;
      this.emit('status-change', this.status);

      // Read and parse Figma JSON
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const figmaData = JSON.parse(fileContent);

      // Use shared conversion logic
      return await this.convertAndSaveFigmaData(figmaData, filePath, options);
    } catch (error) {
      this.status = ImportStatus.ERROR;
      this.emit('status-change', this.status);
      throw error;
    }
  }

  /**
   * Convert Figma data and save as .kizuku project
   * Shared logic for both .json and .fig imports
   * @param {object} figmaData - Figma document data
   * @param {string} originalPath - Original file path
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result
   */
  async convertAndSaveFigmaData(figmaData, originalPath, options = {}) {
    this.status = ImportStatus.CONVERTING;
    this.emit('status-change', this.status);

    // Convert Figma JSON to .kizuku format
    const converter = getFigmaJSONConverter();

    // Set up progress tracking
    converter.on('progress', (progress) => {
      this.progress.processedItems = progress.convertedNodes;
      this.progress.totalItems = progress.totalNodes;
      this.progress.percentage = (progress.convertedNodes / progress.totalNodes) * 100;
      this.emit('progress', this.progress);
    });

    const ext = path.extname(originalPath);
    const conversionResult = await converter.convert(figmaData, {
      name: options.name || path.basename(originalPath, ext),
      license: options.license || 'private',
    });

    this.status = ImportStatus.IMPORTING;
    this.emit('status-change', this.status);

    // Save converted project as .kizuku file
    const kizukuPath = await this.saveConvertedProject(conversionResult.project, originalPath);

    // Update progress
    this.progress.processedItems = this.progress.totalItems;
    this.progress.percentage = 100;
    this.emit('progress', this.progress);

    this.status = ImportStatus.COMPLETE;
    this.emit('status-change', this.status);

    const result = {
      success: true,
      project: conversionResult.project,
      filePath: kizukuPath,
      compatibilityScore: conversionResult.compatibilityScore,
      warnings: conversionResult.stats.warnings,
      errors: conversionResult.stats.errors,
      stats: conversionResult.stats,
    };

    logger.info('Import completed successfully', {
      filePath: kizukuPath,
      compatibilityScore: result.compatibilityScore,
    });

    this.emit('complete', result);

    return result;
  }

  /**
   * Save converted project to .kizuku file
   * @param {object} project - Kizuku project object
   * @param {string} originalPath - Original file path
   * @returns {Promise<string>} Path to saved .kizuku file
   */
  async saveConvertedProject(project, originalPath) {
    let projectsDir;

    try {
      const backend = getBackendServiceManager();
      if (backend.isInitialized()) {
        projectsDir = backend.projectManager.getProjectsDirectory();
      }
    } catch {
      logger.warn('Backend not initialized, using fallback projects directory');
    }

    // Fallback: use app data directory or current working directory
    if (!projectsDir) {
      try {
        const { app } = require('electron');
        projectsDir = path.join(app.getPath('userData'), 'projects');
      } catch {
        // Running outside Electron (e.g., in tests)
        projectsDir = path.join(process.cwd(), 'test-data', 'output');
      }
    }

    // Ensure projects directory exists
    await fs.mkdir(projectsDir, { recursive: true });

    // Generate .kizuku filename
    const baseName = path.basename(originalPath, path.extname(originalPath));
    const kizukuPath = path.join(projectsDir, `${baseName}-imported.kizuku`);

    // Write .kizuku file
    const json = JSON.stringify(project, null, 2);
    await fs.writeFile(kizukuPath, json, 'utf-8');

    logger.info('Converted project saved', { path: kizukuPath });

    return kizukuPath;
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
      const validExtensions = ['.kizuku', '.json', '.fig'];

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
    try {
      const backend = getBackendServiceManager();

      // Check if backend is initialized before accessing config
      if (backend.isInitialized()) {
        const licenseType = backend.getConfigValue('licenseType') || 'starter';

        const limits = {
          starter: 50 * 1024 * 1024, // 50MB
          professional: 500 * 1024 * 1024, // 500MB
          master: 5 * 1024 * 1024 * 1024, // 5GB
          private: 500 * 1024 * 1024, // 500MB (demo)
        };

        return limits[licenseType] || limits.starter;
      }
    } catch {
      logger.warn('Could not get license type, using default file size limit');
    }

    // Default to professional tier limit when backend not initialized
    return 500 * 1024 * 1024; // 500MB
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
