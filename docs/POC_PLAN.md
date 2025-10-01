# Proof of Concept: Embedded PenPot Backend

**Goal**: Validate that we can run PenPot backend embedded in Electron with local database and storage.

**Timeline**: 1-2 weeks

---

## Current Discovery

### SQLite Usage in PenPot
- ✅ PenPot **already uses SQLite** for project export/import (`app.binfile.v2`)
- ✅ They create SQLite databases using `jdbc:sqlite:` URLs
- ✅ The code uses standard JDBC operations (no PostgreSQL-specific APIs for export)
- ❌ **Main database is PostgreSQL-only** (with PostgreSQL-specific initialization)

### PostgreSQL Dependencies Found
```clojure
;; From app.db.clj line 107
(def initsql
  (str "SET statement_timeout = 300000;\n"
       "SET idle_in_transaction_session_timeout = 300000;"))
```

- Uses PostgreSQL-specific SQL commands
- Imports `org.postgresql.*` classes for:
  - PGConnection, PGpoint, PgArray
  - PGInterval, PGobject
  - Large Objects API

### Redis Usage
- Session storage
- Job queues
- Real-time collaboration state
- Caching

---

## Proof of Concept Strategy

### Approach: Minimal Backend Fork

Instead of modifying PenPot directly, create a **minimal fork** for PoC:

1. **Strip down to essentials**:
   - Remove team/collaboration features (private user doesn't need them)
   - Remove webhooks, audit logs, telemetry
   - Remove LDAP, OAuth integrations
   - Keep: File CRUD, user session, asset storage

2. **Replace PostgreSQL with SQLite**:
   - Convert schema migrations
   - Remove PostgreSQL-specific code
   - Use standard SQL only

3. **Mock/Remove Redis**:
   - Use in-memory cache (Caffeine - already included)
   - Remove job queues (run synchronously)
   - Remove real-time collaboration code

4. **Bundle as JAR**:
   - Single executable JAR
   - Embedded configuration
   - SQLite database file

---

## PoC Phase 1: Can We Even Start It? (Week 1)

### Task 1.1: Create Minimal Backend Configuration
**Files to create**:
```
poc/
├── backend-config.edn          # Minimal config for embedded mode
├── database-schema.sql         # SQLite schema (converted from PG)
└── launch-backend.sh           # Test script
```

**Configuration**:
```clojure
{:database {:uri "sqlite:./penpot-local.db"
            :username nil
            :password nil}
 :storage {:backend :fs
           :directory "./penpot-assets"}
 :redis {:enabled false}  ; Mock/disable
 :server {:host "127.0.0.1"
          :port 6060}}
```

### Task 1.2: Convert PostgreSQL Schema to SQLite
**Goal**: Get a working SQLite schema

**Approach**:
1. Find all PostgreSQL migration files in `penpot/backend/resources/migrations/`
2. Convert to SQLite-compatible SQL:
   - Remove `UUID` type → use `TEXT` with constraints
   - Remove `JSONB` → use `TEXT` with JSON validation
   - Remove PostgreSQL-specific types (INTERVAL, GEOMETRY, etc.)
   - Remove indexes that SQLite doesn't support
   - Convert sequences to AUTOINCREMENT

**Estimated files**: 20-30 migration files to convert

### Task 1.3: Patch Database Connection Code
**File**: `penpot/backend/src/app/db.clj`

**Changes needed**:
```clojure
;; BEFORE (line 107)
(def initsql
  (str "SET statement_timeout = 300000;\n"
       "SET idle_in_transaction_session_timeout = 300000;"))

;; AFTER (detect database type)
(defn- get-initsql [jdbc-url]
  (if (str/includes? jdbc-url "sqlite")
    "" ; No init SQL for SQLite
    (str "SET statement_timeout = 300000;\n"
         "SET idle_in_transaction_session_timeout = 300000;")))
```

### Task 1.4: Test Backend Startup
**Command**:
```bash
cd penpot/backend
clojure -M:dev -m app.main
# With our modified config pointing to SQLite
```

**Success criteria**:
- ✅ Backend starts without errors
- ✅ SQLite database file created
- ✅ HTTP server listening on port 6060
- ✅ Can access `/api/health` endpoint

**Expected issues**:
- PostgreSQL-specific queries will fail
- Need to identify and fix/stub them

---

## PoC Phase 2: Can We Create a Project? (Week 1-2)

### Task 2.1: Stub Out Redis
**File**: `penpot/backend/src/app/redis.clj`

**Approach**: Create mock implementation
```clojure
(defn get [key] nil)  ; Always return nil (cache miss)
(defn set [key val] nil)  ; No-op
(defn del [key] nil)  ; No-op
```

Or use Caffeine (already in dependencies):
```clojure
(def cache (com.github.benmanes.caffeine.cache.Caffeine/newBuilder
             (.maximumSize 1000)
             (.build)))
```

### Task 2.2: Fix PostgreSQL-Specific Queries
**Strategy**: Find and convert queries

```bash
# Find PostgreSQL-specific syntax
grep -r "::jsonb\|::uuid\|INTERVAL\|pg_" penpot/backend/src
```

**Common patterns to fix**:
- `::jsonb` → Remove cast (JSON is TEXT in SQLite)
- `::uuid` → Remove cast (UUID is TEXT in SQLite)
- `INTERVAL '1 day'` → `datetime('now', '+1 day')`
- Array operations → JSON arrays

### Task 2.3: Test Basic API Calls
**Test sequence**:
1. Create user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Create team: `POST /api/teams`
4. Create project: `POST /api/projects`
5. Create file: `POST /api/files`
6. Update file: `PUT /api/files/:id`
7. Retrieve file: `GET /api/files/:id`

**Tools**:
```bash
# Use curl or httpie
http POST localhost:6060/api/auth/register \
  email=test@example.com \
  password=test123 \
  fullname="Test User"
```

### Task 2.4: Test File Storage
**Goal**: Verify filesystem storage works

**Test**:
1. Upload image asset
2. Check file exists in `./penpot-assets/`
3. Retrieve image via API
4. Verify file is served correctly

---

## PoC Phase 3: Electron Integration (Week 2)

### Task 3.1: Create Minimal Electron Wrapper
**Files**:
```
poc/electron/
├── main.js              # Launch JVM backend
├── preload.js           # Expose backend API
└── index.html           # Simple UI
```

**Main process**:
```javascript
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

let backendProcess;

async function startBackend() {
  return new Promise((resolve, reject) => {
    // Spawn Java process with backend JAR
    backendProcess = spawn('java', [
      '-jar',
      './backend.jar',
      '--config', './config.edn'
    ]);

    backendProcess.stdout.on('data', (data) => {
      if (data.includes('Server started')) {
        resolve();
      }
    });

    backendProcess.on('error', reject);
  });
}

app.on('ready', async () => {
  await startBackend();

  // Wait for backend to be ready
  await waitForBackend('http://localhost:6060/api/health');

  // Create window pointing to backend
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  win.loadURL('http://localhost:6060');
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
```

### Task 3.2: Bundle JRE
**Options**:
1. Use `jlink` to create minimal JRE (~60MB)
2. Use full JRE (~150MB)
3. Assume Java is installed (testing only)

**For PoC**: Assume Java installed, skip bundling

### Task 3.3: Test End-to-End Flow
**Goal**: Complete user journey

1. Launch Electron app
2. Backend starts automatically
3. Frontend loads in window
4. Create new project
5. Add some shapes
6. Save project
7. Close app
8. Relaunch app
9. Project still exists

**Success criteria**:
- ✅ App launches without Docker
- ✅ Can create and save project
- ✅ Data persists across restarts
- ✅ Files stored locally
- ✅ No external dependencies needed

---

## Expected Challenges & Solutions

### Challenge 1: PostgreSQL-Specific Features
**Examples**:
- JSONB indexing and queries
- Array types
- UUID generation
- Large Objects for file storage

**Solutions**:
- JSONB → JSON strings (lose query performance, acceptable for local)
- Arrays → JSON arrays or separate tables
- UUID → Generate in app layer, store as TEXT
- Large Objects → Store as BLOB or filesystem

### Challenge 2: Schema Complexity
**Problem**: PenPot has evolved over years, 100+ migrations

**Solution**:
- Don't convert all migrations
- Create **fresh SQLite schema** based on latest PostgreSQL schema
- Write single migration script
- Versioning comes later

### Challenge 3: Performance
**Problem**: SQLite may be slower than PostgreSQL

**Solution**:
- For single-user local use, performance is less critical
- Enable WAL mode: `PRAGMA journal_mode=WAL;`
- Add appropriate indexes
- Profile and optimize later

### Challenge 4: Redis Removal
**Problem**: Some features may hard-depend on Redis

**Solution**:
- Identify critical Redis uses
- Mock with in-memory cache
- Remove non-critical features (job queues → synchronous)

---

## Success Metrics

### Minimum Viable PoC:
- [ ] Backend starts with SQLite (no PostgreSQL)
- [ ] Backend starts without Redis (or mocked)
- [ ] Can create user account
- [ ] Can create project
- [ ] Can save simple design file
- [ ] Can reopen file after restart
- [ ] Files stored locally (not cloud)
- [ ] Runs from Electron (no Docker)

### Nice to Have:
- [ ] Can import .penpot file
- [ ] Can export .penpot file
- [ ] Can upload images
- [ ] Images stored locally
- [ ] Startup time < 10 seconds

---

## Deliverables

After PoC completion:

1. **Working Demo**
   - Electron app that launches PenPot
   - Create/save/load projects
   - No Docker required

2. **Documentation**
   - List of all PostgreSQL queries that needed conversion
   - List of removed features (teams, webhooks, etc.)
   - Performance benchmarks
   - File size measurements

3. **Code Artifacts**
   - Modified backend configuration
   - SQLite schema file
   - Electron launcher
   - Build scripts

4. **Decision Document**
   - Is this approach viable?
   - What's the effort for full implementation?
   - What are the blockers?
   - Recommendations for next steps

---

## Timeline

**Week 1**:
- Days 1-2: Schema conversion
- Days 3-4: Backend modifications
- Day 5: Test backend standalone

**Week 2**:
- Days 1-2: Fix query issues
- Days 3-4: Electron integration
- Day 5: End-to-end testing & documentation

**Total**: 10 working days

---

## Next Immediate Steps

1. **Tonight**: Explore PostgreSQL schema
   ```bash
   cd penpot/backend
   find resources/migrations -name "*.sql" | wc -l
   cat resources/migrations/* > full-schema.sql
   ```

2. **Tomorrow**: Start schema conversion
   - Create `poc/sqlite-schema.sql`
   - Convert user, team, project, file tables
   - Test creation

3. **Day 3**: Patch database connection
   - Modify `app.db.clj`
   - Test with SQLite URL
   - Fix initialization errors

4. **Day 4+**: Iterate on query fixes

---

## Risk Assessment

**Low Risk**:
- SQLite integration (they already use it for export)
- Filesystem storage (already supported)
- Electron wrapper (straightforward)

**Medium Risk**:
- Schema conversion (tedious but doable)
- Query compatibility (need to find and fix)
- Redis mocking (may impact features)

**High Risk**:
- None identified that would block PoC

**Overall**: PoC is **LOW RISK** and **HIGH VALUE**
