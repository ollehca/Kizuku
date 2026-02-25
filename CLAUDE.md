# Kizuku 築 Development Guide

> **Claude Code CLI: Read this file at the start of every session.**

## Project Overview

**Kizu** is a desktop design application built on PenPot, enabling Figma file import and offline-first design work. It's positioned as "The Figma Liberation Tool" - one-time purchase, true file ownership, no subscriptions.

**Current Focus:** Phase 1 - Private license with Figma import (no collaboration yet).

---

## ⚠️ CODE QUALITY RULES (Non-Negotiable)

These limits are enforced by ESLint. Code that violates them WILL NOT pass linting.

| Rule | Limit | If Exceeded |
|------|-------|-------------|
| Function length | 50 lines max | Split into helpers |
| File length | 500 lines max | Create modules |
| Nesting depth | 4 levels max | Extract logic |
| Parameters | 5 max | Use options object |
| Complexity | 10 cyclomatic | Decompose |
| Line length | 100 chars max | Break lines |

### Required Patterns
```javascript
// ✅ Use const/let, never var
const data = getData();

// ✅ Use === not ==
if (value === null) {}

// ✅ Always use braces
if (condition) {
  doThing();
}

// ✅ camelCase names, min 3 chars
const userName = 'test';

// ✅ JSDoc on every function
/**
 * Brief description.
 * @param {string} name - Parameter description
 * @returns {Object} Return description
 */
function myFunction(name) {}
```

### Don't Do These
- ❌ Create functions over 50 lines
- ❌ Use `var` anywhere
- ❌ Use `==` for comparison
- ❌ Skip JSDoc comments
- ❌ Ignore lint errors
- ❌ Commit without running `npm run lint`

---

## Quick Start

### One-Command Startup (Recommended)
```bash
./scripts/start-kizuku.sh
```

This script automatically:
1. Starts PenPot Docker containers (if not running)
2. Starts shadow-cljs for ClojureScript hot-reload (eliminates console errors)
3. Verifies frontend is accessible
4. Launches Kizu

### Manual Setup
```bash
# 1. Start PenPot development environment
cd penpot && ./manage.sh start-devenv

# 2. Wait for containers
sleep 30

# 3. Start shadow-cljs (required for clean console - run in background)
docker exec -d penpot-devenv-main bash -c \
  "cd /home/penpot/penpot/frontend && yarn run watch:app:main"

# 4. Wait for shadow-cljs to initialize
sleep 20

# 5. Start Kizuku app (from Kizuku directory)
npm start
```

### What Each Service Does
| Port | Service | Purpose |
|------|---------|---------|
| 3449 | PenPot Frontend | Serves the UI (via nginx) |
| 3448 | Shadow-cljs | Hot-reload WebSocket (eliminates console errors) |
| 9999 | Kizuku Mock Backend | Intercepts PenPot API calls |
| 6060 | PenPot Backend | Java backend (not used in offline mode) |

---

## Architecture

```
src/
├── main.js                     # Electron main process
├── preload.js                  # Fetch interceptor + IPC bridge
├── ipc-handlers.js             # IPC channel definitions
├── services/
│   ├── penpot-mock-backend.js  # Mock API (port 9999)
│   ├── license-storage.js      # License validation
│   ├── user-storage.js         # Local user data
│   └── figma/                  # ⭐ FIGMA IMPORT SYSTEM
│       ├── figma-importer.js   # Main orchestrator
│       ├── fig-file-parser.js  # Parse .fig ZIP
│       └── figma-json-converter.js # Convert to .kizuku
└── frontend-integration/
    └── auth-integration.js     # Auto-login for offline
```

### Service Endpoints
| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3449 | PenPot UI (via nginx) |
| Shadow-cljs | http://localhost:3448 | Hot-reload WebSocket |
| Mock Backend | http://localhost:9999 | Kizuku local API |
| Backend API | http://localhost:6060/api | PenPot backend (not used offline) |

### PenPot Frontend (ClojureScript)
PenPot's UI is written in ClojureScript. Kizuku modifications to PenPot are in:
- `penpot/frontend/src/app/main/ui.cljs` - Main UI container
- `penpot/frontend/src/app/main/data/team.cljs` - Team state handling

**To modify PenPot frontend:**
1. Ensure shadow-cljs is running (`./scripts/start-kizuku.sh` handles this)
2. Edit `.cljs` files in `penpot/frontend/src/`
3. Changes hot-reload automatically (watch console for errors)

---

## Current Priorities

### P0: Fix Figma Import (ACTIVE)
The import pipeline must convert .fig files to .kizuku format accurately.

**Import Flow:**
```
.fig file → Extract ZIP → Parse canvas.json → Convert nodes → Generate .kizuku
```

**Key conversion challenges:**
1. **Coordinates:** Figma uses absolute, Kizuku needs relative to parent
2. **Colors:** Figma uses 0-1 range, Kizuku needs 0-255 range
3. **Text:** Figma has per-character styling (characterStyleOverrides)

**Critical files:**
- `src/services/figma/figma-importer.js` - Main entry point
- `src/services/figma/fig-file-parser.js` - ZIP extraction
- `src/services/figma/figma-json-converter.js` - Node conversion

### P1: Dashboard Display
Mock backend must return valid Transit-encoded responses for:
- `get-profile` - User data
- `get-teams` - Single "My Workspace"
- `get-projects` - Local project list

### P2: File Operations
Save/load .kizuku files locally via native dialogs.

---

## Demo License and Account

### Kizuku Demo (for testing auth flow)
```bash
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

Creates:
- **License Code:** `KIZUKU-50019-99FF9-D4EFF-5DE58-DC837`
- **License Type:** Private (auto-login, no password required)
- **Username:** `demouser`
- **Email:** `demo@penpot.local`

### PenPot Demo (for backend services)
- **Email:** `demo@penpot.local`
- **Password:** `demo123`

---

## Health Monitoring

```bash
# Full comprehensive check
./scripts/health-check.sh

# Quick status check
./scripts/health-check.sh --quick

# Auto-repair common issues
./scripts/health-check.sh --repair
```

### Manual Health Verification
```bash
curl -f http://localhost:3449                    # Frontend
curl -f http://localhost:6060/api               # Backend API
curl -f http://localhost:3449/js/config.js      # Config asset
```

---

## Troubleshooting

### 404 Errors for JavaScript/CSS Files
```bash
./scripts/health-check.sh --repair
# Or manually:
docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
```

### Demo Login Fails
```bash
./scripts/manage-demo-accounts.sh setup
```

### Containers Not Starting
```bash
cd ../penpot
./manage.sh drop-devenv
./manage.sh start-devenv
```

### Desktop App Shows Blank/Error Page
```bash
./scripts/health-check.sh --repair
# If still failing:
./start-dev-environment.sh
```

### Figma Import Not Working
Run diagnostic:
```bash
node figma-import-diagnostic.js /path/to/file.fig
```

Check console for:
- `⚠️ Kizuku Mock Backend: Unhandled command: <command-name>`
- Errors in `figma-importer.js` or `figma-json-converter.js`

---

## Figma Import Reference

### .fig File Structure
```
file.fig (ZIP archive):
├── canvas.json         # Main design data
├── meta.json           # File metadata
├── images/             # Embedded images
└── thumbnail.png       # Preview
```

### Node Type Mapping
| Figma Type | Kizuku Type | Notes |
|------------|-----------|-------|
| DOCUMENT | root | Top-level |
| CANVAS | page | Each page |
| FRAME | frame | Container |
| GROUP | group | Grouping |
| RECTANGLE | rect | Shape |
| ELLIPSE | circle | Shape |
| TEXT | text | Text element |
| COMPONENT | component | Definition |
| INSTANCE | frame | With component ref |

### Common Conversion Bugs
1. **Forgetting to subtract parent position** for relative coords
2. **Not multiplying colors by 255** (Figma uses 0-1)
3. **Missing null checks** on optional properties

---

## Commands Reference

### Development
```bash
npm start              # Launch Kizu
npm run lint           # ESLint check + fix
npm run lint:check     # ESLint check only
npm test               # Run tests
```

### PenPot (from ../penpot/)
```bash
./manage.sh start-devenv    # Start containers
./manage.sh stop-devenv     # Stop containers
./manage.sh drop-devenv     # Remove everything
./manage.sh log-devenv      # View logs
```

### Container Access
```bash
# Main container
docker exec -it penpot-devenv-main bash

# Database
docker exec -it penpotdev-postgres-1 psql -U penpot -d penpot

# Logs
docker logs penpot-devenv-main -f
```

---

## Session Checklist

### Starting Work
1. Read this file (CLAUDE.md)
2. Run `./scripts/health-check.sh --quick`
3. Check current task/priority
4. Review relevant source files

### Before Committing
1. Run `npm run lint`
2. Run `npm test`
3. Verify function lengths < 50 lines
4. Verify file lengths < 500 lines
5. Check all functions have JSDoc

### When Debugging
1. Log the input data
2. Check for null/undefined
3. Verify types
4. Test function in isolation

---

## Key Files

| File | Purpose |
|------|---------|
| `src/services/figma/figma-importer.js` | Main import entry |
| `src/services/figma/figma-json-converter.js` | Node conversion |
| `src/services/penpot-mock-backend.js` | API handlers |
| `src/preload.js` | Fetch interception |
| `eslint.config.js` | Code quality rules |
| `start-dev-environment.sh` | Main startup script |
| `scripts/health-check.sh` | Health monitoring |

---

*This document combines operational setup with code quality standards. Update when procedures change.*
