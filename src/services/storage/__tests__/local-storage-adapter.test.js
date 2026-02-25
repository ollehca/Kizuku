const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { app } = require('electron');
const LocalStorageAdapter = require('../local-storage-adapter');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

describe('LocalStorageAdapter', () => {
  let adapter;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `kizuku-test-storage-${Date.now()}`);
    app.getPath.mockReturnValue(testDir);

    adapter = new LocalStorageAdapter();
    await adapter.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    test('creates base directory', async () => {
      const stats = await fs.stat(adapter.basePath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('creates category directories', async () => {
      for (const categoryPath of Object.values(adapter.categories)) {
        const stats = await fs.stat(categoryPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });

  describe('saveFile', () => {
    test('saves file with content', async () => {
      const result = await adapter.saveFile({
        id: 'test-file.txt',
        content: 'Hello, world!',
        metadata: { mimeType: 'text/plain' },
      });

      expect(result.success).toBe(true);
      expect(result.path).toBeTruthy();
      expect(result.size).toBe(13);

      const savedContent = await fs.readFile(result.path, 'utf-8');
      expect(savedContent).toBe('Hello, world!');
    });

    test('saves file with metadata', async () => {
      await adapter.saveFile({
        id: 'test-image.png',
        content: Buffer.from('fake-image-data'),
        metadata: {
          mimeType: 'image/png',
          width: 800,
          height: 600,
        },
      });

      const filePath = adapter._getFilePath('test-image.png', { mimeType: 'image/png' });
      const metadataPath = `${filePath}.meta.json`;

      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      expect(metadata.mimeType).toBe('image/png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.fileId).toBe('test-image.png');
    });

    test('categorizes image files correctly', async () => {
      await adapter.saveFile({
        id: 'photo.jpg',
        content: Buffer.from('fake-jpg-data'),
        metadata: { mimeType: 'image/jpeg' },
      });

      const filePath = adapter._getFilePath('photo.jpg', { mimeType: 'image/jpeg' });
      expect(filePath).toContain('images');
    });

    test('categorizes font files correctly', async () => {
      await adapter.saveFile({
        id: 'myfont.ttf',
        content: Buffer.from('fake-font-data'),
        metadata: { mimeType: 'font/ttf' },
      });

      const filePath = adapter._getFilePath('myfont.ttf', { mimeType: 'font/ttf' });
      expect(filePath).toContain('fonts');
    });
  });

  describe('loadFile', () => {
    test('loads existing file', async () => {
      const originalContent = 'Test content for loading';

      await adapter.saveFile({
        id: 'load-test.txt',
        content: originalContent,
        metadata: { mimeType: 'text/plain' },
      });

      const loaded = await adapter.loadFile('load-test.txt');
      expect(loaded.toString()).toBe(originalContent);
    });

    test('throws error for non-existent file', async () => {
      await expect(adapter.loadFile('does-not-exist.txt')).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    test('deletes existing file', async () => {
      await adapter.saveFile({
        id: 'delete-me.txt',
        content: 'Content to delete',
        metadata: { mimeType: 'text/plain' },
      });

      const result = await adapter.deleteFile('delete-me.txt');
      expect(result.success).toBe(true);

      const exists = await adapter.fileExists('delete-me.txt');
      expect(exists).toBe(false);
    });

    test('returns false for non-existent file', async () => {
      const result = await adapter.deleteFile('not-there.txt');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('deletes metadata file along with main file', async () => {
      await adapter.saveFile({
        id: 'with-meta.txt',
        content: 'Content',
        metadata: { mimeType: 'text/plain', custom: 'data' },
      });

      const filePath = adapter._getFilePath('with-meta.txt');
      const metadataPath = `${filePath}.meta.json`;

      let metaExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);
      expect(metaExists).toBe(true);

      await adapter.deleteFile('with-meta.txt');

      metaExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);
      expect(metaExists).toBe(false);
    });
  });

  describe('fileExists', () => {
    test('returns true for existing file', async () => {
      await adapter.saveFile({
        id: 'exists.txt',
        content: 'I exist',
        metadata: { mimeType: 'text/plain' },
      });

      const exists = await adapter.fileExists('exists.txt');
      expect(exists).toBe(true);
    });

    test('returns false for non-existent file', async () => {
      const exists = await adapter.fileExists('does-not-exist.txt');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('returns metadata for file with saved metadata', async () => {
      await adapter.saveFile({
        id: 'meta-file.txt',
        content: 'Content',
        metadata: {
          mimeType: 'text/plain',
          author: 'Test User',
          version: 1,
        },
      });

      const metadata = await adapter.getMetadata('meta-file.txt');

      expect(metadata.fileId).toBe('meta-file.txt');
      expect(metadata.mimeType).toBe('text/plain');
      expect(metadata.author).toBe('Test User');
      expect(metadata.version).toBe(1);
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.createdAt).toBeTruthy();
    });

    test('returns basic stats for file without metadata', async () => {
      const filePath = adapter._getFilePath('no-meta.txt');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'Plain content');

      const metadata = await adapter.getMetadata('no-meta.txt');

      expect(metadata.fileId).toBe('no-meta.txt');
      expect(metadata.size).toBe(13);
      expect(metadata.createdAt).toBeTruthy();
    });
  });

  describe('listFiles', () => {
    beforeEach(async () => {
      await adapter.saveFile({
        id: 'file1.jpg',
        content: Buffer.from('img1'),
        metadata: { mimeType: 'image/jpeg' },
      });

      await adapter.saveFile({
        id: 'file2.png',
        content: Buffer.from('img2'),
        metadata: { mimeType: 'image/png' },
      });

      await adapter.saveFile({
        id: 'font1.ttf',
        content: Buffer.from('font'),
        metadata: { mimeType: 'font/ttf' },
      });
    });

    test('lists all files', async () => {
      const files = await adapter.listFiles();
      expect(files.length).toBeGreaterThanOrEqual(3);

      const fileIds = files.map((f) => f.fileId);
      expect(fileIds).toContain('file1.jpg');
      expect(fileIds).toContain('file2.png');
      expect(fileIds).toContain('font1.ttf');
    });

    test('lists files by category', async () => {
      const imageFiles = await adapter.listFiles({ category: 'images' });
      const imageIds = imageFiles.map((f) => f.fileId);

      expect(imageIds).toContain('file1.jpg');
      expect(imageIds).toContain('file2.png');
      expect(imageIds).not.toContain('font1.ttf');
    });

    test('respects limit option', async () => {
      const files = await adapter.listFiles({ limit: 2 });
      expect(files.length).toBeLessThanOrEqual(2);
    });

    test('excludes metadata files', async () => {
      const files = await adapter.listFiles();
      const metaFiles = files.filter((f) => f.fileId.endsWith('.meta.json'));
      expect(metaFiles.length).toBe(0);
    });
  });

  describe('getStats', () => {
    test('returns storage statistics', async () => {
      await adapter.saveFile({
        id: 'stats1.jpg',
        content: Buffer.from('image-data-123'),
        metadata: { mimeType: 'image/jpeg' },
      });

      await adapter.saveFile({
        id: 'stats2.txt',
        content: 'text content',
        metadata: { mimeType: 'text/plain' },
      });

      const stats = await adapter.getStats();

      expect(stats.fileCount).toBeGreaterThanOrEqual(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
      expect(stats.basePath).toBe(adapter.basePath);
    });

    test('returns zero stats for empty storage', async () => {
      const freshAdapter = new LocalStorageAdapter({
        basePath: path.join(testDir, 'empty-storage'),
      });
      await freshAdapter.initialize();

      const stats = await freshAdapter.getStats();

      expect(stats.fileCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('deletes files older than cutoff time', async () => {
      await adapter.saveFile({
        id: 'old-file.txt',
        content: 'Old content',
        metadata: { mimeType: 'text/plain' },
      });

      const filePath = adapter._getFilePath('old-file.txt');
      const oldTime = Date.now() - 25 * 60 * 60 * 1000;
      await fs.utimes(filePath, new Date(oldTime), new Date(oldTime));

      await adapter.saveFile({
        id: 'new-file.txt',
        content: 'New content',
        metadata: { mimeType: 'text/plain' },
      });

      const result = await adapter.cleanup({
        olderThan: 24 * 60 * 60 * 1000,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(1);

      const oldExists = await adapter.fileExists('old-file.txt');
      const newExists = await adapter.fileExists('new-file.txt');

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });

    test('cleans up specific category only', async () => {
      await adapter.saveFile({
        id: 'old-image.jpg',
        content: Buffer.from('old'),
        metadata: { mimeType: 'image/jpeg' },
      });

      const imagePath = adapter._getFilePath('old-image.jpg', { mimeType: 'image/jpeg' });
      const oldTime = Date.now() - 25 * 60 * 60 * 1000;
      await fs.utimes(imagePath, new Date(oldTime), new Date(oldTime));

      const result = await adapter.cleanup({
        olderThan: 24 * 60 * 60 * 1000,
        category: 'images',
      });

      expect(result.success).toBe(true);
    });
  });
});
