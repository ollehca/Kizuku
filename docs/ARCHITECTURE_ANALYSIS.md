# Kizuku Architecture Analysis: Making PenPot Truly Standalone

**Date**: October 1, 2025
**Purpose**: Analyze PenPot's architecture and create a plan to make Kizuku a truly standalone desktop application

---

## Current State: The Problem

### What We Have Now
Kizuku is currently just an **Electron wrapper** around PenPot's web application. It requires:
- Docker installed on user's machine
- Multiple containers running (PostgreSQL, Redis/Valkey, MinIO, PenPot backend)
- Manual container startup before app launch
- ~500MB+ of Docker resources

### What We Need
A **true desktop application** where users:
1. Download Kizu.app (or .exe)
2. Enter license code
3. Start designing immediately
4. No Docker, no external dependencies, no configuration

---

## PenPot Architecture Analysis

### Backend Stack (Clojure/JVM)

**Language**: Clojure (JVM-based functional language)
**Runtime**: Java Virtual Machine (JRE 11+)

**Dependencies identified**:
```clojure
;; From backend/deps.edn
- org.postgresql/postgresql         ; PostgreSQL driver
- org.xerial/sqlite-jdbc           ; SQLite driver (ALREADY INCLUDED!)
- io.lettuce/lettuce-core          ; Redis client
- software.amazon.awssdk/s3        ; AWS S3 for storage
- com.zaxxer/HikariCP              ; Connection pooling
- buddy/buddy-hashers              ; Password hashing
- buddy/buddy-sign                 ; Authentication/JWT
- org.jsoup/jsoup                  ; HTML parsing
- org.im4java/im4java              ; ImageMagick wrapper
```

### Required External Services

#### 1. **PostgreSQL Database**
- **Purpose**: Stores users, projects, teams, file metadata, version history
- **Current**: Docker container with PostgreSQL 15+
- **Configuration**: `database-uri`, `database-username`, `database-password`

#### 2. **Redis/Valkey**
- **Purpose**: Session storage, caching, job queues, real-time collaboration state
- **Current**: Docker container
- **Configuration**: `redis-uri`

#### 3. **Object Storage** (MinIO/S3)
- **Purpose**: Stores uploaded images, fonts, design file blobs
- **Current**: MinIO in Docker (S3-compatible)
- **Configuration**:
  - `objects-storage-backend` (can be "fs" or "s3")
  - `objects-storage-fs-directory` (local filesystem option!)
  - S3 options if using cloud

#### 4. **Asset Storage**
- **Purpose**: Stores temporary assets, exports, thumbnails
- **Current**: Same as object storage
- **Configuration**: Similar to objects-storage

### Critical Discovery: PenPot Already Supports Local Storage!

From `backend/src/app/config.clj`:
```clojure
:objects-storage-backend "fs"        ; "fs" = filesystem!
:objects-storage-fs-directory "assets"
```

**This means PenPot can use local filesystem instead of S3/MinIO!**

---

## Solution Paths

### Path 1: Embedded Backend (Recommended)

**Bundle everything into the Electron app**:

#### Components:
1. **Electron Main Process** (Node.js)
   - Our existing authentication system
   - License management
   - Settings/preferences

2. **Embedded JVM Backend** (PenPot backend + JRE)
   - Bundle OpenJDK 11+ runtime (~100MB)
   - Include PenPot backend .jar
   - Start backend process when app launches
   - Configure to use embedded database + local filesystem

3. **Embedded Database** (SQLite)
   - PenPot already includes SQLite JDBC driver!
   - Replace PostgreSQL with SQLite for single-user local mode
   - All data in `~/Library/Application Support/Kizuku/database.db`

4. **Local Filesystem Storage**
   - Use PenPot's existing "fs" backend
   - Store files in `~/Documents/Kizuku/Projects/`
   - Images/assets in `~/Library/Application Support/Kizuku/assets/`

5. **Redis Replacement** (Embedded or Mocked)
   - Option A: Bundle embedded Redis (Valkey binary ~10MB)
   - Option B: Mock Redis with in-memory Java cache (Caffeine - already included!)
   - For single-user local mode, we can likely mock it

#### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────┐
│  Kizu.app (Packaged Desktop Application)                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Electron Main Process (Node.js)                   │ │
│  │  - License validation                              │ │
│  │  - User authentication                             │ │
│  │  - Process management                              │ │
│  │  - Settings/preferences                            │ │
│  └────────────────────────────────────────────────────┘ │
│               │                                          │
│               ↓ Spawns/Manages                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PenPot Backend Process (JVM)                      │ │
│  │  - Bundled JRE 11+ (~100MB)                        │ │
│  │  - PenPot backend.jar (~50MB)                      │ │
│  │  - Configured for local mode                       │ │
│  │  - HTTP API: http://localhost:RANDOM_PORT          │ │
│  └────────────────────────────────────────────────────┘ │
│               │                                          │
│               ↓ Uses                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  SQLite Database (Embedded)                        │ │
│  │  Location: ~/Library/Application Support/Kizuku/     │ │
│  │  File: database.db (~1-100MB depending on usage)   │ │
│  └────────────────────────────────────────────────────┘ │
│               │                                          │
│               ↓ Stores                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Local File Storage                                │ │
│  │  Projects: ~/Documents/Kizuku/Projects/              │ │
│  │  Assets: ~/Library/Application Support/Kizuku/assets/│ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Electron Renderer (Browser Window)                │ │
│  │  - Loads: http://localhost:RANDOM_PORT             │ │
│  │  - PenPot frontend (React/ClojureScript)           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Effort Estimate:

**Phase 1: Backend Adaptation** (2-4 weeks)
- [ ] Create SQLite migration scripts from PostgreSQL schema
- [ ] Modify PenPot config system for embedded mode
- [ ] Create Redis mock/embedded solution
- [ ] Configure filesystem storage paths
- [ ] Build standalone .jar with all dependencies

**Phase 2: Electron Integration** (1-2 weeks)
- [ ] Bundle JRE with Electron app
- [ ] Add process spawning for backend
- [ ] Implement backend health checking
- [ ] Handle backend lifecycle (start/stop/restart)
- [ ] Configure random port allocation

**Phase 3: File System & Data** (1-2 weeks)
- [ ] Set up user directories on first launch
- [ ] Implement database migration system
- [ ] Handle file import/export
- [ ] Implement backup/restore functionality

**Phase 4: Testing & Polish** (2-3 weeks)
- [ ] Test on macOS, Windows, Linux
- [ ] Optimize startup time
- [ ] Add error recovery mechanisms
- [ ] Create installer packages
- [ ] Documentation

**Total Estimated Time**: 6-11 weeks of focused development

---

### Path 2: Minimal Embedded Stack (Faster but Limited)

**Simpler approach with fewer features**:

Instead of full PenPot backend, create a minimal API server that:
- Handles file I/O for .penpot files
- Manages project metadata in SQLite
- Serves static frontend assets
- Proxies to local filesystem

**Pros**:
- Faster to implement (2-4 weeks)
- Smaller app size
- Simpler architecture

**Cons**:
- Lose many PenPot features (templates, teams, webhooks, plugins)
- Harder to upgrade to cloud/business version later
- May need to reimplement features

---

### Path 3: Hybrid Docker (Not Recommended)

**Bundle Docker Desktop inside the app**:

**Pros**: Minimal changes to existing setup

**Cons**:
- Huge download (1GB+)
- Slow startup
- High resource usage
- Poor user experience
- Docker licensing issues (commercial use requires subscription)

---

## Recommended Approach: Path 1 (Embedded Backend)

### Why This Is The Best Path:

1. **Future-proof**: Same backend works for both local and cloud
2. **Feature-complete**: All PenPot features available
3. **User experience**: Click and run, no configuration
4. **Maintainable**: Can merge upstream PenPot updates
5. **SQLite support exists**: PenPot already includes SQLite driver!

### Key Technical Challenges:

#### Challenge 1: PostgreSQL → SQLite Migration
**Difficulty**: Medium
**Solution**:
- Write schema conversion scripts
- Test data types compatibility
- Handle PostgreSQL-specific features (JSONB, arrays)
- PenPot uses standard SQL for most queries (good sign!)

#### Challenge 2: Redis Dependency
**Difficulty**: Medium
**Solutions**:
- Option A: Bundle Valkey binary (10MB, simple)
- Option B: Use Caffeine cache (already included, in-memory)
- Option C: Stub out Redis for single-user mode

For private users (local-only), we likely don't need Redis at all since:
- No real-time collaboration
- No job queues (or use in-process threads)
- No distributed caching (single machine)

#### Challenge 3: JVM/JRE Bundling
**Difficulty**: Low
**Solution**:
- Use jlink to create minimal JRE (~50-70MB)
- Bundle with electron-builder
- Per-platform builds (macOS/Windows/Linux)

#### Challenge 4: Process Management
**Difficulty**: Low
**Solution**:
- Use Node.js child_process to spawn JVM
- Health check HTTP endpoint
- Graceful shutdown on app quit

---

## Next Steps

### Immediate Research (This Week):
1. ✅ **Analyze PenPot dependencies** (DONE)
2. ⏳ **Test PenPot with SQLite** instead of PostgreSQL
3. ⏳ **Test PenPot with filesystem storage** instead of MinIO
4. ⏳ **Test PenPot without Redis** (stub implementation)
5. ⏳ **Create minimal proof-of-concept**: Electron + embedded JVM

### Proof of Concept Goals:
- Launch PenPot backend from Electron
- Connect to SQLite database
- Use local filesystem for assets
- Load PenPot frontend in Electron window
- Create and save a simple project

### Success Criteria:
- App launches without Docker
- Can create new project
- Can save project to local file
- Can reopen project on restart
- Total app size < 300MB

---

## Risk Assessment

### High Risk:
- **None identified** - All dependencies are manageable

### Medium Risk:
- **PostgreSQL → SQLite differences**: Some queries may need adjustment
- **Redis removal impact**: May lose some caching performance (acceptable for v1)
- **Upstream PenPot updates**: Need to track changes to backend

### Low Risk:
- **JVM bundling**: Well-established pattern (IntelliJ, etc. do this)
- **File storage**: PenPot already supports this
- **Process management**: Standard Electron pattern

---

## Business Implications

### Development Timeline:
- **Proof of Concept**: 1-2 weeks
- **MVP (Private Users Only)**: 6-11 weeks total
- **Business/Cloud Features**: Additional 4-8 weeks

### Resource Requirements:
- 1 developer with Clojure + Electron experience
- Access to macOS, Windows, Linux for testing
- Time to understand PenPot codebase

### Market Strategy:
1. **Phase 1**: Launch private license only (local-first)
2. **Phase 2**: Add business/cloud features once validated
3. **Phase 3**: Consider SaaS offering if demand exists

---

## Conclusion

**Recommended Path**: Embedded Backend (Path 1)

**Why**:
- Achievable in 6-11 weeks
- Future-proof architecture
- Best user experience
- All PenPot features available

**Next Immediate Action**:
Create proof-of-concept to validate that PenPot can run with SQLite + local filesystem + no Redis.

**Timeline to MVP**:
- PoC: 1-2 weeks
- Full implementation: 6-11 weeks
- Beta testing: 2-3 weeks
- **Total: ~3-4 months** to first release

This is a **realistic and achievable goal** for a quality product launch.
