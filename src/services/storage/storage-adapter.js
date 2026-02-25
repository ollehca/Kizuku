/**
 * Base class for storage adapters
 *
 * Provides abstraction layer for file storage operations.
 * Implementations: LocalStorageAdapter (filesystem), CloudStorageAdapter (S3)
 */
class StorageAdapter {
  constructor(config = {}) {
    if (new.target === StorageAdapter) {
      throw new Error('StorageAdapter is abstract, use LocalStorageAdapter or CloudStorageAdapter');
    }
    this.config = config;
  }

  /**
   * Initialize storage adapter
   * Creates necessary directories, validates credentials, etc.
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Save file to storage
   * @param {Object} file - File object
   * @param {string} file.id - Unique file identifier
   * @param {Buffer|string} file.content - File content
   * @param {string} file.mimeType - MIME type
   * @param {Object} [file.metadata] - Additional metadata
   * @returns {Promise<Object>} Result with success, path/url, size
   */
  async saveFile(_file) {
    throw new Error('saveFile() must be implemented by subclass');
  }

  /**
   * Load file from storage
   * @param {string} fileId - File identifier
   * @returns {Promise<Buffer>} File content
   */
  async loadFile(_fileId) {
    throw new Error('loadFile() must be implemented by subclass');
  }

  /**
   * Delete file from storage
   * @param {string} fileId - File identifier
   * @returns {Promise<Object>} Result with success status
   */
  async deleteFile(_fileId) {
    throw new Error('deleteFile() must be implemented by subclass');
  }

  /**
   * Check if file exists
   * @param {string} fileId - File identifier
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(_fileId) {
    throw new Error('fileExists() must be implemented by subclass');
  }

  /**
   * Get file metadata
   * @param {string} fileId - File identifier
   * @returns {Promise<Object>} Metadata object with size, mimeType, etc.
   */
  async getMetadata(_fileId) {
    throw new Error('getMetadata() must be implemented by subclass');
  }

  /**
   * List files (optional, for debugging/admin)
   * @param {Object} [options] - List options
   * @returns {Promise<Array>} Array of file metadata
   */
  async listFiles(_options = {}) {
    throw new Error('listFiles() must be implemented by subclass');
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Stats with totalSize, fileCount, etc.
   */
  async getStats() {
    throw new Error('getStats() must be implemented by subclass');
  }

  /**
   * Cleanup old files (for version history management)
   * @param {Object} options - Cleanup options
   * @param {number} options.olderThan - Delete files older than this (ms)
   * @returns {Promise<Object>} Result with deletedCount
   */
  async cleanup(_options) {
    throw new Error('cleanup() must be implemented by subclass');
  }
}

module.exports = StorageAdapter;
