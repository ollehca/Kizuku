# Week 1: Foundation Tasks

**Goal**: Set up embedded PostgreSQL and abstraction layers
**Timeline**: 5 working days
**Status**: Ready to start

---

## Day 1: Embedded PostgreSQL Research & Setup

### Morning: Research & Dependencies

**Task 1.1**: Add embedded-postgres to PenPot backend
```bash
cd penpot/backend

# Add to deps.edn
# Add this to :deps section:
io.zonky.test/embedded-postgres {:mvn/version "2.0.6"}
```

**Task 1.2**: Create test script
```clojure
;; Create: penpot/backend/test/embedded_pg_test.clj
(ns embedded-pg-test
  (:require [clojure.test :refer :all])
  (:import [io.zonky.test.db.postgres.embedded EmbeddedPostgres]))

(deftest test-embedded-postgres
  (testing "Can start embedded PostgreSQL"
    (let [pg (-> (EmbeddedPostgres/builder)
                 (.setPort 54321)
                 (.start))]
      (try
        (let [ds (.getPostgresDatabase pg)]
          (is (not (nil? ds)))
          (println "✅ Embedded PostgreSQL started successfully"))
        (finally
          (.close pg))))))

(run-tests)
```

**Expected output**: PostgreSQL starts and stops cleanly

### Afternoon: Integration with PenPot Backend

**Task 1.3**: Modify PenPot backend to support embedded mode

```clojure
;; Create: penpot/backend/src/app/db/embedded.clj
(ns app.db.embedded
  (:require [app.common.logging :as l])
  (:import [io.zonky.test.db.postgres.embedded EmbeddedPostgres]
           [java.nio.file Paths]))

(defonce ^:private embedded-instance (atom nil))

(defn start-embedded-postgres
  "Start embedded PostgreSQL instance for local mode"
  [{:keys [data-dir port] :or {port 54321}}]
  (l/info :hint "Starting embedded PostgreSQL"
          :data-dir data-dir
          :port port)
  (let [pg (-> (EmbeddedPostgres/builder)
               (.setDataDirectory (Paths/get data-dir (into-array String [])))
               (.setPort port)
               (.start))]
    (reset! embedded-instance pg)
    (l/info :hint "Embedded PostgreSQL started successfully")
    pg))

(defn stop-embedded-postgres
  "Stop embedded PostgreSQL instance"
  []
  (when-let [pg @embedded-instance]
    (l/info :hint "Stopping embedded PostgreSQL")
    (.close pg)
    (reset! embedded-instance nil)))

(defn get-connection-url
  "Get JDBC connection URL for embedded instance"
  [pg]
  (str "jdbc:postgresql://localhost:" (.getPort pg) "/postgres"))
```

**Task 1.4**: Test with actual PenPot backend startup

```bash
# Start PenPot backend with embedded PostgreSQL
cd penpot/backend
EMBEDDED_MODE=true clojure -M:dev -m app.main
```

**Success criteria**:
- ✅ PostgreSQL starts automatically
- ✅ Backend connects to embedded instance
- ✅ Can access `/api/health` endpoint
- ✅ Database initialized with schema

---

## Day 2: Storage Abstraction Layer

### Morning: Design & Interface

**Task 2.1**: Create storage abstraction interface

```javascript
// Create: src/services/storage/storage-adapter.js

/**
 * Abstract Storage Adapter Interface
 *
 * Implementations:
 * - LocalStorageAdapter (private license)
 * - CloudStorageAdapter (business license)
 */
class StorageAdapter {
  constructor(config) {
    this.config = config;
  }

  /**
   * Initialize storage (create directories, connect, etc.)
   */
  async initialize() {
    throw new Error('StorageAdapter.initialize() must be implemented');
  }

  /**
   * Save file/asset to storage
   * @param {Object} file - File data
   * @param {string} file.id - Unique file ID
   * @param {Buffer|string} file.content - File content
   * @param {string} file.contentType - MIME type
   * @returns {Promise<Object>} - {success, path/url, size}
   */
  async saveFile(file) {
    throw new Error('StorageAdapter.saveFile() must be implemented');
  }

  /**
   * Load file from storage
   * @param {string} fileId - File ID
   * @returns {Promise<Buffer>} - File content
   */
  async loadFile(fileId) {
    throw new Error('StorageAdapter.loadFile() must be implemented');
  }

  /**
   * Delete file from storage
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} - Success
   */
  async deleteFile(fileId) {
    throw new Error('StorageAdapter.deleteFile() must be implemented');
  }

  /**
   * Check if file exists
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>}
   */
  async fileExists(fileId) {
    throw new Error('StorageAdapter.fileExists() must be implemented');
  }

  /**
   * List all files (optional, for debugging)
   * @returns {Promise<Array>} - Array of file IDs
   */
  async listFiles() {
    throw new Error('StorageAdapter.listFiles() must be implemented');
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - {totalSize, fileCount, available}
   */
  async getStats() {
    throw new Error('StorageAdapter.getStats() must be implemented');
  }
}

module.exports = StorageAdapter;
```

### Afternoon: Local Implementation

**Task 2.2**: Implement LocalStorageAdapter

```javascript
// Create: src/services/storage/local-storage-adapter.js

const StorageAdapter = require('./storage-adapter');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class LocalStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.basePath = config.basePath || path.join(app.getPath('userData'), 'assets');
  }

  async initialize() {
    // Create directory structure
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'fonts'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'media'), { recursive: true });

    console.log('✅ Local storage initialized:', this.basePath);
    return { success: true, path: this.basePath };
  }

  async saveFile(file) {
    const filePath = this._getFilePath(file.id);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, file.content);

    // Get file size
    const stats = await fs.stat(filePath);

    return {
      success: true,
      path: filePath,
      size: stats.size
    };
  }

  async loadFile(fileId) {
    const filePath = this._getFilePath(fileId);
    return await fs.readFile(filePath);
  }

  async deleteFile(fileId) {
    const filePath = this._getFilePath(fileId);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true; // Already deleted
      }
      throw error;
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

  async listFiles() {
    const files = [];
    const dirs = ['images', 'fonts', 'media'];

    for (const dir of dirs) {
      const dirPath = path.join(this.basePath, dir);
      try {
        const items = await fs.readdir(dirPath);
        files.push(...items.map(item => `${dir}/${item}`));
      } catch {
        // Directory doesn't exist yet
      }
    }

    return files;
  }

  async getStats() {
    // Calculate total size recursively
    let totalSize = 0;
    let fileCount = 0;

    const calculateSize = async (dirPath) => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          await calculateSize(itemPath);
        } else {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    };

    try {
      await calculateSize(this.basePath);
    } catch {
      // Directory doesn't exist yet
    }

    return {
      totalSize,
      fileCount,
      path: this.basePath
    };
  }

  _getFilePath(fileId) {
    // Determine subdirectory based on file ID or type
    // For now, simple approach: first char determines directory
    const subdir = this._getSubdirectory(fileId);
    return path.join(this.basePath, subdir, fileId);
  }

  _getSubdirectory(fileId) {
    // Could be smarter - detect type from extension, etc.
    if (fileId.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
      return 'images';
    } else if (fileId.match(/\.(ttf|otf|woff|woff2)$/i)) {
      return 'fonts';
    } else {
      return 'media';
    }
  }
}

module.exports = LocalStorageAdapter;
```

**Task 2.3**: Create factory and tests

```javascript
// Create: src/services/storage/storage-factory.js

const LocalStorageAdapter = require('./local-storage-adapter');
// CloudStorageAdapter will be created later

function createStorageAdapter(licenseType, config = {}) {
  if (licenseType === 'private') {
    return new LocalStorageAdapter(config);
  } else if (licenseType === 'business') {
    // TODO: Implement CloudStorageAdapter
    throw new Error('Cloud storage not yet implemented');
  } else {
    throw new Error(`Unknown license type: ${licenseType}`);
  }
}

module.exports = { createStorageAdapter };
```

**Task 2.4**: Write tests

```javascript
// Create: tests/unit/storage-adapter.test.js

const { createStorageAdapter } = require('../../src/services/storage/storage-factory');
const fs = require('fs').promises;
const path = require('path');

describe('Storage Adapter', () => {
  let storage;
  const testDataPath = './test-data/storage';

  beforeEach(async () => {
    storage = createStorageAdapter('private', { basePath: testDataPath });
    await storage.initialize();
  });

  afterEach(async () => {
    await fs.rm(testDataPath, { recursive: true, force: true });
  });

  test('saves and loads file', async () => {
    const fileData = {
      id: 'test-image.png',
      content: Buffer.from('fake image data'),
      contentType: 'image/png'
    };

    const saveResult = await storage.saveFile(fileData);
    expect(saveResult.success).toBe(true);

    const loadedContent = await storage.loadFile('test-image.png');
    expect(loadedContent.toString()).toBe('fake image data');
  });

  test('deletes file', async () => {
    const fileData = {
      id: 'test-delete.png',
      content: Buffer.from('test'),
      contentType: 'image/png'
    };

    await storage.saveFile(fileData);
    expect(await storage.fileExists('test-delete.png')).toBe(true);

    await storage.deleteFile('test-delete.png');
    expect(await storage.fileExists('test-delete.png')).toBe(false);
  });

  test('gets storage stats', async () => {
    const stats = await storage.getStats();
    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('fileCount');
  });
});
```

---

## Day 3: Authentication Abstraction Layer

### Morning: Auth Interface Design

**Task 3.1**: Create auth abstraction interface

```javascript
// Create: src/services/auth/auth-provider.js

/**
 * Abstract Authentication Provider Interface
 */
class AuthProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Authenticate user with credentials
   * @param {Object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @param {boolean} credentials.rememberMe
   * @returns {Promise<Object>} - {success, user, token}
   */
  async authenticate(credentials) {
    throw new Error('AuthProvider.authenticate() must be implemented');
  }

  /**
   * Validate session/token
   * @param {string} token - Session token
   * @returns {Promise<boolean>}
   */
  async validateSession(token) {
    throw new Error('AuthProvider.validateSession() must be implemented');
  }

  /**
   * Refresh session/token
   * @param {string} token - Current token
   * @returns {Promise<Object>} - {success, token, expiresAt}
   */
  async refreshSession(token) {
    throw new Error('AuthProvider.refreshSession() must be implemented');
  }

  /**
   * Logout user
   * @returns {Promise<boolean>}
   */
  async logout() {
    throw new Error('AuthProvider.logout() must be implemented');
  }

  /**
   * Get current user info
   * @returns {Promise<Object>} - {username, email, fullName}
   */
  async getCurrentUser() {
    throw new Error('AuthProvider.getCurrentUser() must be implemented');
  }

  /**
   * Create new user account
   * @param {Object} userData
   * @returns {Promise<Object>} - {success, user}
   */
  async createAccount(userData) {
    throw new Error('AuthProvider.createAccount() must be implemented');
  }
}

module.exports = AuthProvider;
```

### Afternoon: Local Implementation

**Task 3.2**: Implement LocalAuthProvider (wraps our existing system)

```javascript
// Create: src/services/auth/local-auth-provider.js

const AuthProvider = require('./auth-provider');
const authOrchestrator = require('../auth-orchestrator');
const authStorage = require('../auth-storage');
const userStorage = require('../user-storage');

class LocalAuthProvider extends AuthProvider {
  constructor(config = {}) {
    super(config);
  }

  async authenticate(credentials) {
    // Use our existing local auth system
    const result = await authOrchestrator.authenticateUser(
      credentials.username,
      credentials.password,
      credentials.rememberMe || false
    );

    return result;
  }

  async validateSession(token) {
    // Check if session is still valid
    return authStorage.hasValidCredentials();
  }

  async refreshSession(token) {
    // For local auth, sessions don't expire (or have long expiry)
    // Just return current session info
    const sessionInfo = authStorage.getSessionInfo();

    if (sessionInfo.hasSession) {
      return {
        success: true,
        token: sessionInfo.token,
        expiresAt: sessionInfo.expiresAt
      };
    }

    return { success: false, error: 'No active session' };
  }

  async logout() {
    const result = authOrchestrator.logoutUser();
    return result.success;
  }

  async getCurrentUser() {
    const result = await authOrchestrator.getUserSummary();

    if (result.success) {
      return result.user;
    }

    return null;
  }

  async createAccount(userData) {
    const result = await authOrchestrator.createUserAccount(userData);
    return result;
  }
}

module.exports = LocalAuthProvider;
```

**Task 3.3**: Create factory

```javascript
// Create: src/services/auth/auth-factory.js

const LocalAuthProvider = require('./local-auth-provider');
// CloudAuthProvider will be created later

function createAuthProvider(licenseType, config = {}) {
  if (licenseType === 'private') {
    return new LocalAuthProvider(config);
  } else if (licenseType === 'business') {
    // TODO: Implement CloudAuthProvider
    throw new Error('Cloud auth not yet implemented');
  } else {
    throw new Error(`Unknown license type: ${licenseType}`);
  }
}

module.exports = { createAuthProvider };
```

---

## Day 4: Configuration Manager

### All Day: Unified Config System

**Task 4.1**: Create configuration manager

```javascript
// Create: src/services/config-manager.js

const { app } = require('electron');
const licenseStorage = require('./license-storage');
const path = require('path');

class ConfigManager {
  constructor() {
    this._config = null;
  }

  /**
   * Load and return configuration based on license type
   */
  getConfig() {
    if (!this._config) {
      this._config = this._loadConfig();
    }
    return this._config;
  }

  /**
   * Reload configuration (call after license change)
   */
  reload() {
    this._config = null;
    return this.getConfig();
  }

  /**
   * Get specific config value
   */
  get(key) {
    const config = this.getConfig();
    return this._getNestedValue(config, key);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    const config = this.getConfig();
    return config.features[feature] === true;
  }

  /**
   * Get license type
   */
  getLicenseType() {
    try {
      const license = licenseStorage.getLicenseSync();
      return license ? license.type : 'private';
    } catch {
      return 'private';
    }
  }

  /**
   * Check if running in local mode
   */
  isLocalMode() {
    return this.get('mode') === 'local';
  }

  /**
   * Check if running in cloud mode
   */
  isCloudMode() {
    return this.get('mode') === 'cloud';
  }

  // Private methods

  _loadConfig() {
    const licenseType = this.getLicenseType();
    const userDataPath = app.getPath('userData');
    const documentsPath = app.getPath('documents');

    const baseConfig = {
      appName: 'Kizu',
      version: app.getVersion(),
      licenseType: licenseType,
      paths: {
        userData: userDataPath,
        documents: path.join(documentsPath, 'Kizu'),
        database: path.join(userDataPath, 'database'),
        assets: path.join(userDataPath, 'assets'),
        cache: path.join(userDataPath, 'cache'),
        logs: path.join(userDataPath, 'logs'),
        backups: path.join(userDataPath, 'database', 'backups')
      }
    };

    if (licenseType === 'private') {
      return {
        ...baseConfig,
        mode: 'local',
        database: {
          type: 'embedded-postgres',
          host: 'localhost',
          port: this._findFreePort(),
          name: 'kizu',
          username: 'kizu',
          password: this._generatePassword(),
          dataDirectory: path.join(userDataPath, 'database', 'postgresql')
        },
        storage: {
          type: 'local',
          basePath: path.join(userDataPath, 'assets')
        },
        auth: {
          type: 'local',
          sessionDuration: 30 * 24 * 60 * 60 * 1000  // 30 days
        },
        features: {
          collaboration: false,
          teams: false,
          webhooks: false,
          telemetry: false,
          realtime: false,
          comments: false,
          versionHistory: true,  // Local version history
          export: true,
          import: true
        },
        versionHistory: {
          enabled: true,
          maxAge: 24 * 60 * 60 * 1000,  // 24 hours (configurable)
          snapshotInterval: 5 * 60 * 1000,  // 5 minutes
          maxSnapshots: 288  // 24h at 5min intervals
        }
      };
    } else if (licenseType === 'business') {
      return {
        ...baseConfig,
        mode: 'cloud',
        database: {
          type: 'cloud-postgres',
          connectionString: process.env.CLOUD_DB_URL || 'postgresql://...'
        },
        storage: {
          type: 'cloud-s3',
          endpoint: process.env.CLOUD_STORAGE_ENDPOINT || 'https://s3.amazonaws.com',
          bucket: process.env.CLOUD_STORAGE_BUCKET || 'kizu-assets',
          region: process.env.CLOUD_STORAGE_REGION || 'us-east-1'
        },
        auth: {
          type: 'cloud',
          apiEndpoint: process.env.CLOUD_API_ENDPOINT || 'https://api.kizu.app',
          sessionDuration: 7 * 24 * 60 * 60 * 1000  // 7 days
        },
        features: {
          collaboration: true,
          teams: true,
          webhooks: true,
          telemetry: true,
          realtime: true,
          comments: true,
          versionHistory: true,  // Cloud version history
          export: true,
          import: true
        },
        versionHistory: {
          enabled: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
          unlimited: true  // Cloud = unlimited history
        }
      };
    }

    // Fallback to private config
    return this._loadConfig();
  }

  _getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  _findFreePort() {
    // For now, use a high port number
    // TODO: Actually find a free port
    return 54321;
  }

  _generatePassword() {
    // Generate random password for embedded PostgreSQL
    return require('crypto').randomBytes(16).toString('hex');
  }
}

// Singleton instance
module.exports = new ConfigManager();
```

**Task 4.2**: Write tests

---

## Day 5: Integration Testing & Cross-Platform Setup

### Morning: Test Abstraction Layers

**Task 5.1**: Integration tests

```javascript
// Create: tests/integration/abstraction-layers.test.js

const configManager = require('../../src/services/config-manager');
const { createStorageAdapter } = require('../../src/services/storage/storage-factory');
const { createAuthProvider } = require('../../src/services/auth/auth-factory');

describe('Abstraction Layers Integration', () => {
  test('Config manager detects license type', () => {
    const licenseType = configManager.getLicenseType();
    expect(licenseType).toBe('private'); // Default when no license
  });

  test('Creates correct storage adapter for license type', () => {
    const storage = createStorageAdapter('private');
    expect(storage.constructor.name).toBe('LocalStorageAdapter');
  });

  test('Creates correct auth provider for license type', () => {
    const auth = createAuthProvider('private');
    expect(auth.constructor.name).toBe('LocalAuthProvider');
  });

  test('Feature flags work correctly', () => {
    expect(configManager.isFeatureEnabled('collaboration')).toBe(false);
    expect(configManager.isFeatureEnabled('versionHistory')).toBe(true);
  });

  test('Storage adapter can save and load files', async () => {
    const storage = createStorageAdapter('private');
    await storage.initialize();

    const testFile = {
      id: 'test.png',
      content: Buffer.from('test data'),
      contentType: 'image/png'
    };

    await storage.saveFile(testFile);
    const loaded = await storage.loadFile('test.png');

    expect(loaded.toString()).toBe('test data');
  });
});
```

### Afternoon: Cross-Platform Build Setup

**Task 5.2**: Update package.json for cross-platform builds

```json
// Update package.json
{
  "name": "kizu",
  "version": "0.1.0",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder --mac --win --linux"
  },
  "build": {
    "appId": "com.kizu.app",
    "productName": "Kizu",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.graphics-design",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns"
    },
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Graphics",
      "icon": "build/icon.png"
    }
  }
}
```

**Task 5.3**: Test build on macOS

```bash
npm run build:mac
```

**Task 5.4**: Document build process for Windows/Linux

---

## Success Criteria for Week 1

### Must Have:
- ✅ Embedded PostgreSQL starts successfully
- ✅ Storage abstraction layer works (local mode)
- ✅ Auth abstraction layer works (local mode)
- ✅ Configuration manager detects license and configures correctly
- ✅ All tests passing
- ✅ Can build app for macOS

### Nice to Have:
- ✅ Can build for Windows/Linux (or documented how-to)
- ✅ Performance benchmarks
- ✅ Memory usage analysis

---

## Blockers & Escalation

If you hit blockers:
1. **Embedded PostgreSQL won't start**: Check Java version, try different ports
2. **Cross-platform build fails**: May need platform-specific dependencies
3. **Tests failing**: Review error messages, may need test environment setup

---

## Next Week Preview

**Week 2** will focus on:
- Integrating PenPot backend with embedded PostgreSQL
- Mocking/removing Redis
- Testing all PenPot API endpoints
- Starting version history implementation

---

Ready to start? Let me know when you want to begin Day 1!
