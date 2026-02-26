const fs = require('node:fs').promises;
const path = require('node:path');
const { app } = require('electron');
const StorageAdapter = require('./storage-adapter');

/**
 * Local filesystem storage adapter
 * Stores files in user's application data directory
 */
class LocalStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);

    this.basePath = config.basePath || path.join(app.getPath('userData'), 'assets');

    this.categories = {
      images: path.join(this.basePath, 'images'),
      fonts: path.join(this.basePath, 'fonts'),
      media: path.join(this.basePath, 'media'),
      projects: path.join(this.basePath, 'projects'),
      temp: path.join(this.basePath, 'temp'),
    };
  }

  async initialize() {
    await fs.mkdir(this.basePath, { recursive: true });

    for (const categoryPath of Object.values(this.categories)) {
      await fs.mkdir(categoryPath, { recursive: true });
    }
  }

  _isImageType(mimeType) {
    return mimeType.startsWith('image/');
  }

  _isFontType(mimeType, fileId) {
    return mimeType.includes('font') || fileId.match(/\.(ttf|otf|woff|woff2)$/i);
  }

  _isMediaType(mimeType) {
    return mimeType.startsWith('video/') || mimeType.startsWith('audio/');
  }

  _getCategoryByType(metadata) {
    if (metadata.type === 'project') {
      return 'projects';
    }
    if (metadata.temporary) {
      return 'temp';
    }
    return null;
  }

  _getCategoryByMimeType(mimeType, fileId) {
    if (this._isImageType(mimeType)) {
      return 'images';
    }
    if (this._isFontType(mimeType, fileId)) {
      return 'fonts';
    }
    if (this._isMediaType(mimeType)) {
      return 'media';
    }
    return 'media';
  }

  _getCategory(fileId, metadata = {}) {
    const typeCategory = this._getCategoryByType(metadata);
    if (typeCategory) {
      return typeCategory;
    }

    return this._getCategoryByMimeType(metadata.mimeType || '', fileId);
  }

  _getFilePath(fileId, metadata = {}) {
    const category = this._getCategory(fileId, metadata);
    const categoryPath = this.categories[category];
    return path.join(categoryPath, fileId);
  }

  async _saveMetadata(filePath, metadata, id, stats) {
    const metadataPath = `${filePath}.meta.json`;
    const metaContent = {
      ...metadata,
      fileId: id,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
    await fs.writeFile(metadataPath, JSON.stringify(metaContent, null, 2));
  }

  async saveFile(file) {
    const { id, content, metadata = {} } = file;
    const filePath = this._getFilePath(id, metadata);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);

    const stats = await fs.stat(filePath);

    if (metadata && Object.keys(metadata).length > 0) {
      await this._saveMetadata(filePath, metadata, id, stats);
    }

    return {
      success: true,
      path: filePath,
      size: stats.size,
      createdAt: stats.birthtime,
    };
  }

  async loadFile(fileId) {
    const filePath = this._getFilePath(fileId);
    return await fs.readFile(filePath);
  }

  async deleteFile(fileId) {
    const filePath = this._getFilePath(fileId);
    const metadataPath = `${filePath}.meta.json`;

    try {
      await fs.unlink(filePath);

      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist
      }

      return { success: true, fileId };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { success: false, error: 'File not found', fileId };
      }
      throw err;
    }
  }

  async fileExists(fileId) {
    const filePath = this._getFilePath(fileId);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(fileId) {
    const filePath = this._getFilePath(fileId);
    const metadataPath = `${filePath}.meta.json`;

    const stats = await fs.stat(filePath);

    let metadata = {};
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch {
      // No metadata file
    }

    return {
      fileId,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      ...metadata,
    };
  }

  _getCategoriesToScan(category) {
    return category ? [this.categories[category]] : Object.values(this.categories);
  }

  _shouldSkipEntry(entry) {
    return entry.endsWith('.meta.json');
  }

  _createFileEntry(entry, filePath, stats) {
    return {
      fileId: entry,
      path: filePath,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  async _processFileEntry(entry, categoryPath, files, limit) {
    const filePath = path.join(categoryPath, entry);
    const stats = await fs.stat(filePath);

    if (stats.isFile()) {
      files.push(this._createFileEntry(entry, filePath, stats));
    }

    return this._hasReachedLimit(files, limit);
  }

  async _scanCategoryForFiles(categoryPath, files, limit) {
    const entries = await fs.readdir(categoryPath);

    for (const entry of entries) {
      if (this._shouldSkipEntry(entry)) {
        continue;
      }

      const reachedLimit = await this._processFileEntry(entry, categoryPath, files, limit);
      if (reachedLimit) {
        break;
      }
    }
  }

  _hasReachedLimit(files, limit) {
    return limit && files.length >= limit;
  }

  async _scanCategorySafely(categoryPath, files, limit) {
    try {
      await this._scanCategoryForFiles(categoryPath, files, limit);
      return this._hasReachedLimit(files, limit);
    } catch {
      return false;
    }
  }

  async listFiles(options = {}) {
    const { category, limit } = options;
    const files = [];
    const categoriesToScan = this._getCategoriesToScan(category);

    for (const categoryPath of categoriesToScan) {
      const reachedLimit = await this._scanCategorySafely(categoryPath, files, limit);
      if (reachedLimit) {
        break;
      }
    }

    return files;
  }

  async _getCategoryStats(categoryPath) {
    let categorySize = 0;
    let categoryCount = 0;
    const entries = await fs.readdir(categoryPath);

    for (const entry of entries) {
      if (this._shouldSkipEntry(entry)) {
        continue;
      }

      const filePath = path.join(categoryPath, entry);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        categorySize += stats.size;
        categoryCount++;
      }
    }

    return { size: categorySize, count: categoryCount };
  }

  _accumulateStats(totalSize, fileCount, stats) {
    return {
      totalSize: totalSize + stats.size,
      fileCount: fileCount + stats.count,
    };
  }

  async getStats() {
    let totalSize = 0;
    let fileCount = 0;
    const categoryStats = {};

    for (const [category, categoryPath] of Object.entries(this.categories)) {
      try {
        const stats = await this._getCategoryStats(categoryPath);
        categoryStats[category] = stats;
        const accumulated = this._accumulateStats(totalSize, fileCount, stats);
        totalSize = accumulated.totalSize;
        fileCount = accumulated.fileCount;
      } catch {
        categoryStats[category] = { size: 0, count: 0 };
      }
    }

    return { totalSize, fileCount, categories: categoryStats, basePath: this.basePath };
  }

  _shouldDeleteFile(stats, cutoffTime) {
    return stats.isFile() && stats.mtimeMs < cutoffTime;
  }

  async _deleteFileWithMetadata(filePath) {
    await fs.unlink(filePath);
    try {
      await fs.unlink(`${filePath}.meta.json`);
    } catch {
      // Metadata might not exist
    }
  }

  async _cleanupCategory(categoryPath, cutoffTime) {
    let deletedCount = 0;
    const entries = await fs.readdir(categoryPath);

    for (const entry of entries) {
      if (this._shouldSkipEntry(entry)) {
        continue;
      }

      const filePath = path.join(categoryPath, entry);
      const stats = await fs.stat(filePath);

      if (this._shouldDeleteFile(stats, cutoffTime)) {
        await this._deleteFileWithMetadata(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async cleanup(options) {
    const { olderThan, category = null } = options;
    const cutoffTime = Date.now() - olderThan;
    let deletedCount = 0;

    const categoriesToClean = this._getCategoriesToScan(category);

    for (const categoryPath of categoriesToClean) {
      try {
        const count = await this._cleanupCategory(categoryPath, cutoffTime);
        deletedCount += count;
      } catch {
        // Directory might not exist
      }
    }

    return {
      success: true,
      deletedCount,
      cutoffTime: new Date(cutoffTime).toISOString(),
    };
  }
}

module.exports = LocalStorageAdapter;
