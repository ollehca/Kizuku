# Kizu: Unified Development Approach

**Date**: October 1, 2025
**Status**: Strategic Direction Agreed
**Timeline**: 8-12 weeks to cross-platform MVP

---

## Core Philosophy

**"Measure twice, cut once"** - Build it right the first time to minimize rework.

Focus on:
- ✅ Polished, professional experience
- ✅ Cross-platform from day one
- ✅ Cloud-ready architecture (for future business licenses)
- ✅ Feature-complete for private users

---

## Strategic Decisions

### 1. Timeline & Quality: Polished MVP (8-12 weeks)

**Decision**: Quality over speed. Ship when it's ready.

**Rationale**:
- First impressions matter
- Reduces rework and technical debt
- Professional product from launch
- Worth the extra 2-4 weeks investment

**Target Launch**: ~3 months from start

---

### 2. Feature Scope: Private License V1

#### ✅ INCLUDED (Essential)

**Core Design Tools**:
- Complete PenPot design suite (shapes, text, images, vectors)
- Layers, pages, artboards
- Components and instances
- Styles and design tokens
- Boolean operations
- Path editing
- Gradients, shadows, effects
- Export (PNG, SVG, PDF)

**File Management**:
- Create/save/open projects
- Import .penpot files (from Figma exports, etc.)
- Export .penpot files (for sharing)
- Asset library (local)
- Font management

**User Experience**:
- Undo/redo (unlimited)
- **Version history (local, 24h configurable)** ⭐ NEW
- Keyboard shortcuts
- Contextual menus
- Search/filter
- Preferences/settings

**Version History Details**:
- Auto-save every N minutes (configurable: 1-30 min)
- Keep snapshots for X time (configurable: 5min - 24 hours)
- Rollback to any snapshot
- Disk space management (auto-cleanup old versions)
- Visual timeline UI

#### ❌ REMOVED (Not needed for single-user local)

**Collaboration Features**:
- Teams/workspaces
- Real-time collaboration
- Comments/feedback
- Shared libraries (will support export/import)
- User permissions/roles

**Enterprise Features**:
- Webhooks
- LDAP/OAuth integrations
- Audit logs
- Usage analytics/telemetry

**Note**: These features stay in codebase but are **disabled** for private licenses. Easy to re-enable for business licenses.

---

### 3. Database: Embedded PostgreSQL

**Decision**: Use `embedded-postgres` Java library

**Implementation**:
```
Kizu.app/
└── Contents/
    └── Resources/
        └── postgresql/
            ├── bin/           # PostgreSQL binaries
            ├── lib/
            └── share/
```

**Why PostgreSQL over SQLite**:
- ✅ Zero code changes to PenPot backend
- ✅ 100% compatibility guaranteed
- ✅ Can merge upstream PenPot updates
- ✅ Ship 2-3 weeks faster
- ✅ Same tech for local and cloud (consistency)

**Size Impact**: +20-30MB (acceptable trade-off)

**Configuration**:
```java
// Startup configuration
EmbeddedPostgres postgres = EmbeddedPostgres.builder()
    .setDataDirectory(userDataPath + "/database")
    .setPort(findFreePort())  // Random port for isolation
    .start();
```

---

### 4. Java Runtime: Bundle JRE

**Decision**: Bundle minimal JRE with app (no user installation)

**Implementation**:
- Use `jlink` to create minimal JRE (~60-80MB)
- Include only required modules
- Per-platform builds (JRE 17 LTS)

**User Experience**: Click and run. Zero setup.

**Build Process**:
```bash
# Create minimal JRE
jlink --add-modules java.base,java.sql,java.logging,... \
      --output jre-minimal \
      --compress=2 \
      --no-header-files \
      --no-man-pages
```

---

### 5. Platform Strategy: All Three Simultaneously

**Decision**: macOS, Windows, Linux - launch together

**Rationale**:
- Maximize market reach from day one
- Electron makes cross-platform relatively easy
- Design community spans all platforms
- **Figma supports**: macOS, Windows (no native Linux app)
- **Kizuku advantage**: Native Linux support! ⭐

**Testing Matrix**:
| Platform | Architecture | Priority |
|----------|-------------|----------|
| macOS | Intel (x64) | High |
| macOS | Apple Silicon (arm64) | High |
| Windows | x64 | High |
| Windows | arm64 | Medium |
| Linux | x64 | Medium |
| Linux | arm64 | Low |

**Build Pipeline**: GitHub Actions for all platforms

**Estimated Additional Effort**: +2 weeks for cross-platform testing/packaging

---

### 6. Embedded PostgreSQL Library

**Decision**: Use `io.zonky.test:embedded-postgres`

**Maven Dependency**:
```xml
<dependency>
    <groupId>io.zonky.test</groupId>
    <artifactId>embedded-postgres</artifactId>
    <version>2.0.6</version>
</dependency>
```

**Features**:
- ✅ Automatic binary download for platform
- ✅ Lifecycle management
- ✅ Port management
- ✅ Process isolation
- ✅ Clean shutdown

**Alternative Considered**: `com.opentable.components:otj-pg-embedded` (also good, but Zonky is more actively maintained)

---

### 7. File Storage Architecture

**Decision**: Database-centric with export/import

**Structure**:
```
~/Library/Application Support/Kizuku/  (macOS)
%APPDATA%/Kizuku/                      (Windows)
~/.config/Kizuku/                      (Linux)
├── database/
│   ├── postgresql/              # PostgreSQL data directory
│   │   ├── base/
│   │   ├── global/
│   │   └── pg_wal/
│   └── backups/                 # Automatic backups
│       ├── auto-backup-2025-10-01.sql.gz
│       └── auto-backup-2025-10-02.sql.gz
├── assets/
│   ├── images/                  # Uploaded images
│   ├── fonts/                   # Custom fonts
│   └── media/                   # Other media
├── cache/
│   ├── thumbnails/
│   └── previews/
├── logs/
│   ├── app.log
│   └── backend.log
└── config.json                  # User preferences

~/Documents/Kizuku/                # User-facing location
├── Exports/                     # Default export location
│   ├── Project Name.penpot      # Shareable file
│   └── Design Export.svg
└── Imports/                     # Import from here
```

**File Workflow**:
1. **Working**: All projects stored in PostgreSQL database
2. **Export**: User exports to `.kizuku` or `.penpot` file (shareable)
3. **Import**: User imports `.penpot` files (from Figma, other designers)
4. **Backup**: Automatic database backups every 24h

**`.kizuku` File Format**: SQLite database (using PenPot's export format)
- Self-contained
- Can be opened by any Kizuku installation
- Easy to share via email, Dropbox, etc.

---

### 8. Redis: Remove/Mock for Private Users

**Decision**: Remove Redis dependency for single-user mode

**Implementation Strategy**:

#### Phase 1: Identify Redis Usage
```clojure
;; Find all Redis calls in PenPot backend
grep -r "redis" penpot/backend/src
```

#### Phase 2: Create Mock Implementation
```clojure
;; File: src/app/redis_mock.clj
(ns app.redis-mock
  "In-memory mock for Redis (single-user mode)")

(def cache (atom {}))

(defn get [key]
  (@cache key))

(defn set [key val]
  (swap! cache assoc key val))

(defn del [key]
  (swap! cache dissoc key))

;; ... implement other Redis operations as no-ops or in-memory
```

#### Phase 3: Configuration Flag
```clojure
;; In config.edn
{:redis {:enabled false    ; Disable for private licenses
         :mock true}}      ; Use mock implementation

;; In app.redis.clj
(if (get-in config [:redis :mock])
  (require 'app.redis-mock)
  (require 'app.redis-impl))  ; Real Redis for business
```

**Features Lost** (acceptable for private users):
- ❌ Real-time collaboration state (not needed)
- ❌ Distributed job queues (run jobs synchronously)
- ❌ Session sharing across servers (single instance)

**Features Replaced**:
- ✅ Caching: Use Caffeine (in-memory, already in dependencies)
- ✅ Session storage: Use PostgreSQL session table
- ✅ Background jobs: Run in-process threads

---

### 9. Update Strategy: Hybrid (Notify + User Control)

**Decision**: Auto-check for updates, user decides when to install

**Implementation**: Use `electron-updater`

```javascript
// In main process
const { autoUpdater } = require('electron-updater');

// Check for updates on launch (silent)
autoUpdater.checkForUpdates();

// Notify user if update available
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is available. Would you like to download it now?`,
    buttons: ['Download', 'Later'],
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

// Show progress during download
autoUpdater.on('download-progress', (progress) => {
  // Show progress bar in UI
});

// Prompt to install when ready
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. Restart now to install?',
    buttons: ['Restart', 'Later'],
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

**Update Channels**:
- `stable` - Default, production releases
- `beta` - Opt-in for testing new features
- `dev` - Internal testing only

**User Control**:
- Settings: "Check for updates" (on/off)
- Settings: Update channel selection
- Settings: "Download updates automatically" (on/off)
- Manual: Help → Check for Updates

---

### 10. Cloud-Ready Architecture (Future-Proof)

**Decision**: Abstract storage/auth layers NOW for easy cloud integration later

**Architecture Pattern**: Strategy pattern with environment detection

#### Storage Abstraction Layer

```javascript
// src/services/storage-abstraction.js

class StorageAdapter {
  // Override these in subclasses
  async saveFile(fileData) { throw new Error('Not implemented'); }
  async loadFile(fileId) { throw new Error('Not implemented'); }
  async deleteFile(fileId) { throw new Error('Not implemented'); }
  async listFiles() { throw new Error('Not implemented'); }
}

class LocalStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.basePath = app.getPath('userData') + '/assets';
  }

  async saveFile(fileData) {
    // Save to local filesystem
    const filePath = path.join(this.basePath, fileData.id);
    await fs.writeFile(filePath, fileData.content);
    return { success: true, path: filePath };
  }

  async loadFile(fileId) {
    // Load from local filesystem
    const filePath = path.join(this.basePath, fileId);
    return await fs.readFile(filePath);
  }

  // ... other methods
}

class CloudStorageAdapter extends StorageAdapter {
  constructor(config) {
    super();
    this.s3Client = new S3Client(config);
  }

  async saveFile(fileData) {
    // Upload to S3/cloud storage
    await this.s3Client.putObject({
      Bucket: this.config.bucket,
      Key: fileData.id,
      Body: fileData.content
    });
    return { success: true, url: `https://.../${fileData.id}` };
  }

  async loadFile(fileId) {
    // Download from S3/cloud
    const result = await this.s3Client.getObject({
      Bucket: this.config.bucket,
      Key: fileId
    });
    return result.Body;
  }

  // ... other methods
}

// Factory function - detects mode automatically
function createStorageAdapter(licenseType) {
  if (licenseType === 'private') {
    return new LocalStorageAdapter();
  } else if (licenseType === 'business') {
    return new CloudStorageAdapter({
      endpoint: process.env.CLOUD_STORAGE_ENDPOINT,
      bucket: process.env.CLOUD_STORAGE_BUCKET,
      // ... credentials
    });
  }
}

module.exports = { createStorageAdapter };
```

#### Authentication Abstraction Layer

```javascript
// src/services/auth-abstraction.js

class AuthProvider {
  async authenticate(credentials) { throw new Error('Not implemented'); }
  async validateSession(token) { throw new Error('Not implemented'); }
  async logout() { throw new Error('Not implemented'); }
}

class LocalAuthProvider extends AuthProvider {
  // Uses our existing local auth system
  async authenticate(credentials) {
    const result = await authOrchestrator.authenticateUser(
      credentials.username,
      credentials.password,
      credentials.rememberMe
    );
    return result;
  }

  async validateSession(token) {
    return authStorage.hasValidCredentials();
  }

  async logout() {
    return authOrchestrator.logoutUser();
  }
}

class CloudAuthProvider extends AuthProvider {
  constructor(config) {
    super();
    this.apiEndpoint = config.endpoint;
  }

  async authenticate(credentials) {
    // Call cloud API
    const response = await fetch(`${this.apiEndpoint}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    return data;
  }

  async validateSession(token) {
    // Validate with cloud API
    const response = await fetch(`${this.apiEndpoint}/auth/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  }

  // ... other methods
}

// Factory function
function createAuthProvider(licenseType) {
  if (licenseType === 'private') {
    return new LocalAuthProvider();
  } else if (licenseType === 'business') {
    return new CloudAuthProvider({
      endpoint: process.env.CLOUD_API_ENDPOINT
    });
  }
}

module.exports = { createAuthProvider };
```

#### Configuration System

```javascript
// src/services/config-manager.js

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const licenseType = this.getLicenseType();

    const baseConfig = {
      appName: 'Kizuku',
      version: app.getVersion(),
      licenseType: licenseType,
    };

    if (licenseType === 'private') {
      return {
        ...baseConfig,
        mode: 'local',
        database: {
          type: 'embedded-postgres',
          path: app.getPath('userData') + '/database'
        },
        storage: {
          type: 'local',
          path: app.getPath('userData') + '/assets'
        },
        auth: {
          type: 'local',
          sessionDuration: 30 * 24 * 60 * 60 * 1000  // 30 days
        },
        features: {
          collaboration: false,
          teams: false,
          webhooks: false,
          telemetry: false
        }
      };
    } else if (licenseType === 'business') {
      return {
        ...baseConfig,
        mode: 'cloud',
        database: {
          type: 'cloud-postgres',
          connectionString: process.env.CLOUD_DB_URL
        },
        storage: {
          type: 'cloud-s3',
          endpoint: process.env.CLOUD_STORAGE_ENDPOINT,
          bucket: process.env.CLOUD_STORAGE_BUCKET
        },
        auth: {
          type: 'cloud',
          apiEndpoint: process.env.CLOUD_API_ENDPOINT,
          sessionDuration: 7 * 24 * 60 * 60 * 1000  // 7 days
        },
        features: {
          collaboration: true,
          teams: true,
          webhooks: true,
          telemetry: true
        }
      };
    }
  }

  getLicenseType() {
    // Read from our license storage
    const license = licenseStorage.getLicenseSync();
    return license ? license.type : 'private';
  }

  get(key) {
    return this.config[key];
  }

  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }
}

module.exports = new ConfigManager();
```

#### Usage in Application

```javascript
// In main.js or wherever needed
const configManager = require('./services/config-manager');
const { createStorageAdapter } = require('./services/storage-abstraction');
const { createAuthProvider } = require('./services/auth-abstraction');

// Automatically uses correct implementation based on license
const storage = createStorageAdapter(configManager.get('licenseType'));
const auth = createAuthProvider(configManager.get('licenseType'));

// Same API regardless of mode!
await storage.saveFile(fileData);
await auth.authenticate(credentials);

// Feature flags
if (configManager.isFeatureEnabled('collaboration')) {
  // Enable real-time features
}
```

#### "Flip the Switch" Activation

When business user enters business license:

```javascript
// User enters business license code
const licenseResult = await authOrchestrator.validateAndSaveLicense(businessLicenseCode);

if (licenseResult.license.type === 'business') {
  // Show migration dialog
  dialog.showMessageBox({
    type: 'info',
    title: 'Business License Activated',
    message: 'Your account will now connect to Kizuku Cloud for collaboration features. Your local projects will be synced.',
    buttons: ['Migrate Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      // Trigger migration
      migrateToCloud();
    }
  });
}

async function migrateToCloud() {
  // 1. Export all local projects
  const projects = await localDB.getAllProjects();

  // 2. Create cloud account (if needed)
  const cloudAuth = createAuthProvider('business');
  await cloudAuth.createAccount({
    email: user.email,
    password: user.password
  });

  // 3. Upload projects to cloud
  const cloudStorage = createStorageAdapter('business');
  for (const project of projects) {
    await cloudStorage.saveFile(project);
  }

  // 4. Update config
  configManager.reload();  // Picks up new license type

  // 5. Restart app in cloud mode
  app.relaunch();
  app.quit();
}
```

**Result**: Business user gets collaboration features with ZERO code changes to PenPot backend!

**Investment**: ~1-2 weeks to build abstraction layers now, saves months of refactoring later.

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up embedded PostgreSQL integration
- [ ] Create abstraction layers (storage, auth, config)
- [ ] Bundle minimal JRE with Electron
- [ ] Test cross-platform builds (macOS, Windows, Linux)

### Phase 2: Backend Integration (Weeks 3-4)
- [ ] Integrate PenPot backend with embedded PostgreSQL
- [ ] Remove/mock Redis for private license mode
- [ ] Test all PenPot API endpoints
- [ ] Implement version history system

### Phase 3: Frontend Integration (Weeks 5-6)
- [ ] Connect Electron to PenPot frontend
- [ ] Implement file menu (New, Open, Save, Export)
- [ ] Add version history UI
- [ ] Implement settings/preferences

### Phase 4: Features & Polish (Weeks 7-9)
- [ ] Complete version history (rollback, timeline UI)
- [ ] Implement auto-updater
- [ ] Add onboarding/tutorial
- [ ] Performance optimization
- [ ] Memory management

### Phase 5: Cross-Platform Testing (Weeks 10-11)
- [ ] Test on all platforms/architectures
- [ ] Fix platform-specific bugs
- [ ] Create installers (DMG, NSIS, AppImage)
- [ ] Code signing and notarization

### Phase 6: Beta & Launch Prep (Week 12)
- [ ] Beta testing with users
- [ ] Bug fixes
- [ ] Documentation
- [ ] Marketing materials
- [ ] Launch!

**Total**: 12 weeks to polished cross-platform MVP

---

## Success Criteria

### Technical:
- ✅ App launches on macOS, Windows, Linux without external dependencies
- ✅ Can create, save, load projects
- ✅ All PenPot design tools work correctly
- ✅ Version history works (rollback within 24h)
- ✅ Import .penpot files from Figma exports
- ✅ Export .penpot files for sharing
- ✅ Startup time < 15 seconds
- ✅ App size < 300MB per platform

### User Experience:
- ✅ Professional, polished UI
- ✅ No setup required (click and run)
- ✅ Intuitive file management
- ✅ Reliable auto-save
- ✅ Clear version history
- ✅ Easy export/share workflow

### Business:
- ✅ Cloud-ready for business licenses
- ✅ Can flip switch to enable collaboration
- ✅ Minimal ongoing maintenance
- ✅ Can merge upstream PenPot updates

---

## Key Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Embedded PostgreSQL issues | Medium | High | Test early, have SQLite fallback plan |
| Cross-platform bugs | High | Medium | Test continuously on all platforms |
| PenPot compatibility | Low | High | Use exact PenPot version, minimal changes |
| App size too large | Medium | Low | Optimize JRE, compress assets |
| Performance issues | Medium | Medium | Profile early, optimize hot paths |

---

## Next Immediate Steps

**This Week**:
1. ✅ Set up development environment
2. ✅ Test embedded-postgres library
3. ✅ Create abstraction layer POC
4. ✅ Test cross-platform Electron builds

**Next Week**:
5. Integrate PenPot backend with embedded PostgreSQL
6. Build storage abstraction layer
7. Build auth abstraction layer
8. Test end-to-end: Electron → Backend → Database

**Week 3**:
9. Implement Redis mocking
10. Test all PenPot features
11. Start version history system

---

## Questions for Later

(These can wait until implementation is underway)

1. **Version History**: How to visualize the timeline? (Similar to Figma's version history?)
2. **Cloud Pricing**: What will business license cost? (Affects infrastructure decisions)
3. **Cloud Infrastructure**: AWS? DigitalOcean? Supabase?
4. **Beta Testing**: How many users? Invite-only?
5. **Marketing**: ProductHunt launch? Design community outreach?

---

## Documentation Location

All technical docs in `docs/` directory:
- `ARCHITECTURE_ANALYSIS.md` - Technical deep-dive
- `POC_PLAN.md` - Proof-of-concept roadmap
- `POC_FINDINGS.md` - Research results
- `UNIFIED_APPROACH.md` - This document (strategic direction)
- `IMPLEMENTATION_GUIDE.md` - To be created (step-by-step how-to)

---

## Approval & Sign-Off

**Strategic Direction**: ✅ APPROVED
**Timeline**: 12 weeks to launch
**Next Action**: Begin Phase 1 (Foundation)

Let's build this! 🚀
