# PoC Findings: PenPot Backend Analysis

**Date**: October 1, 2025
**Status**: Initial Analysis Complete
**Next**: Schema Conversion

---

## Summary

PenPot backend is **heavily PostgreSQL-dependent** with 145 migration files using PostgreSQL-specific features. However, **conversion to SQLite is feasible** with moderate effort.

---

## Key Discoveries

### 1. Database Architecture

**PostgreSQL Features Used**:
- ✅ UUID generation (`uuid-ossp` extension)
- ✅ JSONB for flexible schema fields
- ✅ Triggers for auto-timestamps
- ✅ PL/pgSQL stored procedures
- ✅ Partial/filtered indexes
- ✅ Array types
- ✅ `clock_timestamp()` function
- ✅ Foreign keys with CASCADE

**Migration Count**: 145 SQL files

**Core Tables** (from migration 0002):
- `profile` - User accounts
- `team` - Workspaces/organizations
- `team_profile_rel` - Team membership
- `session` - User sessions
- `profile_attr` - Key-value attributes
- `project` - Design projects (in migration 0003)
- `file` - Design files

### 2. SQLite Already Used!

PenPot uses SQLite for **export/import** functionality:
- File: `app.binfile.v2.clj`
- Creates temporary SQLite databases
- Uses `jdbc:sqlite:` URLs
- Proves SQLite works with their data model

**This is excellent news** - schema is compatible!

### 3. Redis Dependencies

From configuration analysis:
- Session storage
- Job queues (background tasks)
- Real-time collaboration state
- Caching layer

**For single-user local mode**: Most Redis features can be removed or mocked.

---

## Conversion Strategy

### Approach: Generate Fresh SQLite Schema

Instead of converting 145 migrations, we'll:

1. **Extract final schema** from running PostgreSQL instance
2. **Convert to SQLite** in one pass
3. **Test with PenPot backend**

This avoids maintaining 145 conversion scripts.

### PostgreSQL → SQLite Mapping

| PostgreSQL Feature | SQLite Equivalent | Conversion Complexity |
|-------------------|-------------------|----------------------|
| `UUID` type | `TEXT` with CHECK constraint | ✅ Easy |
| `uuid_generate_v4()` | Generate in application | ✅ Easy |
| `JSONB` | `TEXT` (JSON) | ✅ Easy (lose indexing) |
| `timestamptz` | `TEXT` (ISO8601) or `INTEGER` (unix) | ✅ Easy |
| `clock_timestamp()` | `datetime('now')` | ✅ Easy |
| Arrays | JSON arrays or separate tables | ⚠️ Medium |
| Triggers | SQLite triggers (different syntax) | ⚠️ Medium |
| PL/pgSQL functions | Implement in application | ⚠️ Medium |
| Partial indexes | Not supported | ⚠️ Medium (workaround) |
| Foreign keys CASCADE | Supported (need `PRAGMA foreign_keys=ON`) | ✅ Easy |

###  Example Conversions

#### PostgreSQL (Original):
```sql
CREATE TABLE profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  modified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz NULL,
  fullname text NOT NULL DEFAULT '',
  email text NOT NULL,
  ...
);

CREATE UNIQUE INDEX profile__email__idx
    ON profile (email)
 WHERE deleted_at IS null;  -- Partial index

CREATE TRIGGER team__modified_at__tgr
BEFORE UPDATE ON team
   FOR EACH ROW EXECUTE PROCEDURE update_modified_at();
```

#### SQLite (Converted):
```sql
CREATE TABLE profile (
  id TEXT PRIMARY KEY,  -- UUID as TEXT
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT NULL,
  fullname TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  ...
  CHECK(length(id) = 36)  -- Validate UUID format
);

-- Partial index workaround: filter in queries instead
-- OR: Create expression index if needed (SQLite 3.9+)
CREATE UNIQUE INDEX profile__email__idx
    ON profile (email)
 WHERE deleted_at IS NULL;  -- SQLite 3.8+ supports this!

-- Trigger conversion
CREATE TRIGGER team__modified_at__tgr
AFTER UPDATE ON team
FOR EACH ROW
BEGIN
  UPDATE team SET modified_at = datetime('now')
   WHERE id = NEW.id;
END;
```

---

## Effort Estimate (Refined)

### Phase 1: Schema Conversion (3-5 days)
- **Day 1**: Extract current PostgreSQL schema
  - Run PenPot with PostgreSQL
  - Use `pg_dump --schema-only`
  - Clean up to get base schema

- **Day 2-3**: Convert to SQLite
  - Write conversion script (Python/bash)
  - Handle types, triggers, functions
  - Test schema creation

- **Day 4**: Seed data
  - Create system user/team (from migrations)
  - Add test data
  - Validate foreign keys

- **Day 5**: Buffer for issues

### Phase 2: Backend Modifications (3-5 days)
- **Day 1**: Database connection layer
  - Modify `app.db.clj` for SQLite support
  - Remove PostgreSQL init SQL
  - Test connection pooling

- **Day 2-3**: Query compatibility
  - Find PostgreSQL-specific queries
  - Convert to SQLite-compatible SQL
  - Test CRUD operations

- **Day 4**: UUID generation
  - Move UUID generation to application layer
  - Remove dependency on `uuid-ossp`

- **Day 5**: Testing & fixes

### Phase 3: Redis Removal/Mocking (2-3 days)
- **Day 1**: Analyze Redis usage
  - Grep for Redis calls
  - Identify critical vs. nice-to-have

- **Day 2**: Create mock implementation
  - Use Caffeine for caching
  - Remove/stub job queues
  - Remove collaboration features

- **Day 3**: Testing

### Phase 4: Electron Integration (2-3 days)
- **Day 1**: Process spawning
  - Launch JVM from Electron
  - Health checks
  - Graceful shutdown

- **Day 2**: Packaging
  - Bundle JAR
  - (Optional) Bundle JRE
  - Test on macOS

- **Day 3**: End-to-end testing

### Total: 10-16 working days (2-3 weeks)

---

## Risks & Mitigation

### Risk 1: Query Incompatibilities
**Probability**: High
**Impact**: Medium
**Mitigation**:
- Test incrementally
- Keep list of converted queries
- May need to patch some Clojure code

### Risk 2: Performance
**Probability**: Medium
**Impact**: Low
**Mitigation**:
- SQLite is fast for single-user
- Enable WAL mode
- Add indexes as needed

### Risk 3: Feature Loss
**Probability**: High
**Impact**: Low (for MVP)
**Mitigation**:
- We're targeting private users (no teams/collaboration)
- Can add back features later
- Document removed features

### Risk 4: Upstream Updates
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Fork PenPot backend for Kizu
- Cherry-pick important updates
- May diverge over time (acceptable)

---

## Recommendations

### ✅ Proceed with PoC

**Reasoning**:
1. SQLite is already proven to work (export feature)
2. Schema conversion is tedious but straightforward
3. No fundamental technical blockers
4. 2-3 week timeline is reasonable

### Recommended Next Steps

**This Week**:
1. ✅ Extract PostgreSQL schema from running instance
2. ✅ Create SQLite conversion script
3. ✅ Test schema creation

**Next Week**:
4. Modify PenPot backend for SQLite
5. Test basic operations (user, project, file CRUD)
6. Create minimal Electron wrapper

**Week 3**:
7. End-to-end testing
8. Document findings
9. Decide on full implementation

### Alternative: Use PostgreSQL Embedded

**If SQLite proves difficult**, consider:
- **PostgreSQL Embedded** (pg_embed)
- Bundle PostgreSQL binary with app
- No schema conversion needed
- ~10MB additional size
- More complex, but maintains compatibility

**Trade-off**: Larger app size, but zero code changes to PenPot backend.

---

## Technical Decisions Needed

### Decision 1: UUID Storage
**Options**:
- A) TEXT with CHECK constraint (standard)
- B) BLOB (16 bytes, more efficient)
- C) TEXT without validation (simplest)

**Recommendation**: Option A (TEXT with CHECK)
- Human-readable in database
- Compatible with PenPot export format
- Negligible size difference for local use

### Decision 2: Timestamp Format
**Options**:
- A) TEXT (ISO8601): `2025-10-01T16:00:00Z`
- B) INTEGER (Unix timestamp): `1727794800`
- C) REAL (Julian day): `2460588.166667`

**Recommendation**: Option A (ISO8601 TEXT)
- Most compatible with PenPot code
- Human-readable
- SQLite's datetime functions work well with this

### Decision 3: JSONB Replacement
**Options**:
- A) TEXT column with JSON string
- B) JSON1 extension (SQLite built-in)
- C) Separate normalized tables

**Recommendation**: Option B (JSON1 extension)
- Built into SQLite 3.38+
- Can query JSON: `json_extract(data, '$.field')`
- Compatible with PenPot's JSONB usage

### Decision 4: Triggers
**Options**:
- A) Convert all triggers to SQLite syntax
- B) Remove triggers, handle in application
- C) Hybrid: critical ones only

**Recommendation**: Option A (Convert triggers)
- Maintains data integrity
- Auto-timestamps are important
- SQLite trigger syntax is similar

---

## Success Criteria for PoC

### Minimum Success:
- [ ] Backend starts with SQLite (no PostgreSQL)
- [ ] Can create user via API
- [ ] Can create project via API
- [ ] Can create file via API
- [ ] Data persists after restart
- [ ] Runs from Electron app

### Stretch Goals:
- [ ] Can save design changes
- [ ] Can load existing file
- [ ] Can export .penpot file
- [ ] Startup time < 15 seconds
- [ ] App bundle < 300MB

---

## Files to Create for PoC

```
poc/
├── README.md                        # PoC documentation
├── schema/
│   ├── extract-pg-schema.sh         # Export from PostgreSQL
│   ├── convert-to-sqlite.py         # Conversion script
│   └── penpot.sqlite.sql            # Final SQLite schema
├── backend/
│   ├── config.edn                   # SQLite configuration
│   ├── patches/
│   │   ├── db.clj.patch            # Database layer mods
│   │   ├── redis.clj.patch         # Redis mock
│   │   └── uuid.clj.patch          # UUID generation
│   └── build.sh                    # Build modified backend
├── electron/
│   ├── package.json
│   ├── main.js                     # Launch backend process
│   ├── preload.js
│   └── index.html
└── test/
    ├── test-api.sh                 # cURL tests
    └── test-e2e.js                 # Playwright tests
```

---

## Next Immediate Actions

**Tonight/Tomorrow**:
1. Start PenPot dev environment
2. Export PostgreSQL schema: `pg_dump --schema-only`
3. Begin conversion script

**Command**:
```bash
# In penpot directory
./manage.sh start-devenv

# Wait for startup, then:
docker exec penpotdev-postgres-1 \
  pg_dump -U penpot -d penpot --schema-only \
  > poc/schema/penpot-pg.sql
```

---

## Questions for User

1. **Timeline flexibility**: Is 2-3 weeks acceptable for PoC, or do you need faster?
2. **Scope**: OK to remove team/collaboration features for initial version?
3. **Java requirement**: Acceptable to require Java 11+ installed, or must bundle JRE?
4. **App size**: Is 200-300MB download acceptable?
5. **Platform priority**: macOS first, or cross-platform from start?

---

## Conclusion

**PoC is VIABLE** ✅

- Clear path to SQLite conversion
- Manageable complexity
- Reasonable timeline
- No show-stoppers identified

**Recommendation**: Proceed with schema conversion tomorrow.
