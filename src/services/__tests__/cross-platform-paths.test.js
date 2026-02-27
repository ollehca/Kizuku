const path = require('node:path');

// Test path handling across different platforms
describe('Cross-Platform Path Handling', () => {
  let originalPlatform;

  beforeAll(() => {
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  const setPlatform = (platform) => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  };

  describe('Path Normalization', () => {
    test('handles windows-style paths', () => {
      // Note: path.join behavior depends on actual OS, not process.platform
      const basePath = String.raw`C:\Users\TestUser\AppData\Local\Kizuku`;
      const assetsPath = path.join(basePath, 'assets');
      const dbPath = path.join(basePath, 'database');

      expect(assetsPath).toContain('assets');
      expect(dbPath).toContain('database');
      // Windows paths are absolute only on Windows
      if (process.platform === 'win32') {
        expect(path.isAbsolute(basePath)).toBe(true);
      }
    });

    test('handles mac/linux paths correctly', () => {
      setPlatform('darwin');

      const basePath = '/Users/TestUser/Library/Application Support/Kizuku';
      const assetsPath = path.join(basePath, 'assets');
      const dbPath = path.join(basePath, 'database');

      expect(assetsPath).toContain('assets');
      expect(dbPath).toContain('database');
      expect(path.isAbsolute(basePath)).toBe(true);
    });

    test('path.join produces correct separators', () => {
      const parts = ['base', 'sub', 'file.txt'];
      const joined = path.join(...parts);

      if (process.platform === 'win32') {
        expect(joined).toMatch(/base\\sub\\file\.txt/);
      } else {
        expect(joined).toBe('base/sub/file.txt');
      }
    });
  });

  describe('Storage Category Paths', () => {
    test('creates consistent category paths', () => {
      const basePath =
        process.platform === 'win32'
          ? String.raw`C:\Users\TestUser\AppData\Kizuku\assets`
          : '/Users/TestUser/Library/Kizuku/assets';

      const categories = {
        images: path.join(basePath, 'images'),
        fonts: path.join(basePath, 'fonts'),
        media: path.join(basePath, 'media'),
        data: path.join(basePath, 'data'),
      };

      expect(categories.images).toContain('images');
      expect(categories.fonts).toContain('fonts');
      expect(path.dirname(categories.images)).toBe(path.normalize(basePath));
    });

    test('creates consistent category paths on unix', () => {
      setPlatform('linux');

      const basePath = '/home/testuser/.local/share/Kizuku/assets';
      const categories = {
        images: path.join(basePath, 'images'),
        fonts: path.join(basePath, 'fonts'),
        media: path.join(basePath, 'media'),
        data: path.join(basePath, 'data'),
      };

      expect(categories.images).toBe(`${basePath}/images`);
      expect(categories.fonts).toBe(`${basePath}/fonts`);
      expect(path.dirname(categories.images)).toBe(basePath);
    });
  });

  describe('Path Security', () => {
    test('detects path traversal attempts', () => {
      const basePath = '/safe/base/path';
      const maliciousPath = path.join(basePath, '../../etc/passwd');
      const normalizedPath = path.normalize(maliciousPath);

      // Path traversal should escape basePath
      expect(normalizedPath.startsWith(basePath)).toBe(false);
    });

    test('validates paths stay within base directory', () => {
      const basePath = '/safe/base/path';
      const safePath = path.join(basePath, 'subdir/file.txt');
      const resolvedSafe = path.resolve(safePath);

      expect(resolvedSafe.startsWith(path.resolve(basePath))).toBe(true);
    });
  });

  describe('Database Path Handling', () => {
    test('postgres data directory path is platform-appropriate', () => {
      setPlatform('darwin');
      const userDataPath = '/Users/TestUser/Library/Application Support/Kizuku';
      const dbPath = path.join(userDataPath, 'database');

      expect(dbPath).toBe('/Users/TestUser/Library/Application Support/Kizuku/database');
      expect(path.isAbsolute(dbPath)).toBe(true);
    });

    test('handles spaces in paths correctly', () => {
      const pathWithSpaces = path.join(String.raw`C:\Program Files`, 'Kizuku', 'database');
      expect(pathWithSpaces).toContain('Kizuku');

      const unixPathWithSpaces = path.join('/Applications/Kizuku App', 'database');
      expect(unixPathWithSpaces).toContain('Kizuku App');
    });
  });

  describe('Path Consistency', () => {
    test('all service paths share common base', () => {
      const basePath = '/test/userData';
      const paths = {
        database: path.join(basePath, 'database'),
        assets: path.join(basePath, 'assets'),
        logs: path.join(basePath, 'logs'),
        temp: path.join(basePath, 'temp'),
      };

      Object.values(paths).forEach((p) => {
        expect(p.startsWith(basePath)).toBe(true);
      });
    });

    test('relative path resolution works correctly', () => {
      const base = '/base/path';
      const relative = './subdir/../other';
      const resolved = path.resolve(base, relative);

      expect(resolved).toBe(path.join(base, 'other'));
    });
  });

  describe('File Extension Handling', () => {
    test('extracts extensions correctly cross-platform', () => {
      const windowsPath = String.raw`C:\Users\test\image.png`;
      const unixPath = '/home/test/image.png';

      expect(path.extname(windowsPath)).toBe('.png');
      expect(path.extname(unixPath)).toBe('.png');
    });

    test('handles files without extensions', () => {
      expect(path.extname('config')).toBe('');
      expect(path.extname('/path/to/config')).toBe('');
    });

    test('handles multiple dots in filename', () => {
      expect(path.extname('archive.tar.gz')).toBe('.gz');
      expect(path.extname('backup.2024.01.01.zip')).toBe('.zip');
    });
  });
});
