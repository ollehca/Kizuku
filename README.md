# Kizuku 築

![Version](https://img.shields.io/badge/version-0.1.0--dev-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

**Professional offline-first desktop design application built on PenPot**

Kizuku is a standalone desktop application that provides a native design experience without requiring internet connectivity or cloud services. It uses PenPot's open-source frontend while replacing the backend with a local mock system.

---

## Key Features

- **Offline-First**: No internet connection required for private license users
- **Figma Import**: Import `.fig` and Figma JSON files directly
- **Local Storage**: All files stored locally in `.kizuku` format
- **Native Experience**: Full desktop integration with menus, shortcuts, and file associations
- **License-Based Access**: Private (offline) or Business (cloud collaboration) modes

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Main Window │  │ IPC Handlers│  │ Backend Services    │  │
│  │ (BrowserWin)│  │             │  │ - License Storage   │  │
│  └─────────────┘  └─────────────┘  │ - User Storage      │  │
│                                     │ - Project Manager   │  │
│                                     └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Preload Script                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Fetch Interceptor (injected into main world)        │    │
│  │ - Redirects /api/rpc/command/* to localhost:9999    │    │
│  │ - Handles both fetch() and XMLHttpRequest           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ electronAPI (contextBridge)                         │    │
│  │ - File operations, clipboard, Figma import API      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PenPot Frontend (ClojureScript)                     │    │
│  │ - Loaded from localhost:3449 (dev) or bundled       │    │
│  │ - All API calls intercepted by fetch interceptor    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Kizuku Injections                                     │    │
│  │ - Auth integration (auto-login for private license) │    │
│  │ - Branding (logo, colors)                           │    │
│  │ - Drag-and-drop handlers                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Mock Backend Server (port 9999)              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ HTTP Server handling PenPot RPC commands:           │    │
│  │ - get-profile, get-teams, get-projects              │    │
│  │ - get-file, get-file-libraries                      │    │
│  │ - All responses Transit-encoded                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Main Process | `src/main.js` | Window management, mock server, IPC |
| Preload Script | `src/preload.js` | Fetch interceptor, electronAPI bridge |
| Mock Backend | `src/services/penpot-mock-backend.js` | Handles all PenPot API calls locally |
| Auth Integration | `src/frontend-integration/auth-integration.js` | Auto-login for private license |
| Figma Importer | `src/services/figma/figma-importer.js` | Converts Figma files to .kizuku |
| License Storage | `src/services/license-storage.js` | Validates and stores license keys |
| User Storage | `src/services/user-storage.js` | Stores user profile locally |

---

## License System

Kizuku uses a license-based access model:

### Private License (Current Focus)
- **Offline-first**: No internet required
- **Auto-login**: No password needed, license = authentication
- **Local storage**: All files stored on user's machine
- **Single-user**: No collaboration features

### Business License (Future)
- **Cloud sync**: Files synced to Kizuku cloud
- **Collaboration**: Real-time multi-user editing
- **Team management**: Shared workspaces
- **Requires login**: Email/password authentication

### License Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ First Launch │ ──▶ │ Enter License│ ──▶ │ License Valid│
│              │     │ Key          │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┴────────────────────────┐
                     │                                                     │
                     ▼                                                     ▼
          ┌──────────────────┐                              ┌──────────────────┐
          │ Private License  │                              │ Business License │
          │                  │                              │                  │
          │ • Auto-login     │                              │ • Login required │
          │ • Offline mode   │                              │ • Cloud sync     │
          │ • Local storage  │                              │ • Collaboration  │
          └──────────────────┘                              └──────────────────┘
```

---

## Mock Backend System

The mock backend replaces PenPot's server entirely for private license users.

### How It Works

1. **Fetch Interceptor** (in preload.js):
   - Injected into page context BEFORE any scripts run
   - Intercepts all `fetch()` and `XMLHttpRequest` calls
   - Redirects `/api/rpc/command/*` to `localhost:9999`

2. **Mock Server** (in main.js):
   - HTTP server running on port 9999
   - Handles PenPot RPC commands
   - Returns Transit-encoded responses

3. **Handled Commands**:
   | Command | Purpose |
   |---------|---------|
   | `get-profile` | Returns user profile from license |
   | `get-teams` | Returns single "My Workspace" team |
   | `get-projects` | Returns local projects |
   | `get-file` | Returns file data for editor |
   | `get-font-variants` | Returns empty (uses system fonts) |
   | `push-audit-events` | Silently ignored (no analytics) |

---

## Figma Import

Kizuku can import Figma designs directly without using Figma's API.

### Supported Formats
- `.fig` - Native Figma binary files
- `.json` - Figma JSON export (from plugins)

### Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Drag & Drop │ ──▶ │ Parse File  │ ──▶ │ Convert to  │ ──▶ │ Open in     │
│ .fig/.json  │     │ (fig-kiwi)  │     │ .kizuku format│     │ Workspace   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Components

| File | Purpose |
|------|---------|
| `src/services/figma/figma-importer.js` | Main orchestrator |
| `src/services/figma/fig-file-parser.js` | Parses .fig binary files |
| `src/services/figma/figma-json-converter.js` | Converts Figma JSON to .kizuku |

### .kizuku File Format

```json
{
  "version": "1.0.0",
  "type": "kizuku-project",
  "metadata": {
    "id": "uuid",
    "name": "Project Name",
    "created": "ISO date",
    "modified": "ISO date"
  },
  "data": {
    "pages": [...],
    "components": [...],
    "colorLibrary": [...],
    "typographyLibrary": [...]
  },
  "assets": {
    "images": [],
    "fonts": []
  }
}
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- Docker (for PenPot frontend development server)

### Quick Start

```bash
# Clone repository
git clone https://github.com/ollehca/Kizuku.git
cd Kizu

# Install dependencies
npm install

# Start PenPot development environment (in separate terminal)
cd ../penpot && ./manage.sh start-devenv

# Start Kizu
npm start
```

### Development Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start Electron app in dev mode |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run lint:check` | Check linting without fixing |
| `npm run format` | Format code with Prettier |
| `npm test` | Run test suite |

### Test Demo License

```bash
# Create test license and user data
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

This creates:
- License: `KIZUKU-50019-99FF9-D4EFF-5DE58-DC837` (private type)
- User: `demouser` / `Demo User` / `demo@penpot.local`

---

## File Structure

```
kizuku/
├── src/
│   ├── main.js                      # Electron main process
│   ├── preload.js                   # Preload with fetch interceptor
│   ├── ipc-handlers.js              # IPC communication handlers
│   ├── menu-builder.js              # Application menu
│   ├── tab-manager.js               # File tabs management
│   │
│   ├── services/
│   │   ├── penpot-mock-backend.js   # Mock backend handlers
│   │   ├── backend-service-manager.js # Backend orchestration
│   │   ├── license-storage.js       # License key storage
│   │   ├── user-storage.js          # User profile storage
│   │   ├── auth-orchestrator.js     # Authentication flow
│   │   └── figma/
│   │       ├── figma-importer.js    # Import orchestrator
│   │       ├── fig-file-parser.js   # .fig binary parser
│   │       └── figma-json-converter.js # JSON to .kizuku converter
│   │
│   ├── frontend-integration/
│   │   ├── auth-integration.js      # Auto-login injection
│   │   └── penpot-auth-override.js  # PenPot auth bypass
│   │
│   ├── utils/
│   │   ├── drag-drop-handler.js     # Drag and drop support
│   │   ├── frontend-injection.js    # Script injection utilities
│   │   ├── workspace-launcher.js    # Opens files in workspace
│   │   └── css-manager.js           # CSS hot reloading
│   │
│   └── renderer/
│       ├── import-figma.html        # Figma import UI
│       ├── import-figma.js          # Import UI controller
│       └── project-dashboard.js     # Dashboard logic
│
├── test/
│   └── figma-import.test.js         # Figma import tests
│
├── test-data/                       # Test fixtures
│   ├── license.dat                  # Test license
│   ├── user.dat                     # Test user
│   └── output/                      # Test output files
│
├── scripts/
│   ├── setup-demo-license.js        # Create test license
│   ├── health-check.sh              # System health check
│   └── manage-demo-accounts.sh      # Demo account management
│
├── eslint.config.js                 # Linting rules
├── package.json                     # Dependencies
├── CLAUDE.md                        # Development guide
└── README.md                        # This file
```

---

## Configuration

### Data Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Kizuku/` |
| Windows | `%APPDATA%/Kizuku/` |
| Linux | `~/.config/Kizuku/` |

### Stored Data

| File | Purpose |
|------|---------|
| `license.dat` | Encrypted license key |
| `user.dat` | User profile (name, email) |
| `projects/` | Local .kizuku project files |
| `config.json` | App preferences |

---

## Linting Rules

ESLint enforces code quality:

| Rule | Limit |
|------|-------|
| `max-lines-per-function` | 50 lines |
| `max-lines` (per file) | 500 lines |
| `complexity` | 10 (cyclomatic) |
| `max-depth` | 4 levels |
| `max-len` | 100 characters |

Run `npm run lint` to check and auto-fix issues.

---

## Roadmap

### Completed
- [x] Electron application setup
- [x] PenPot frontend integration
- [x] Mock backend system
- [x] License-based authentication
- [x] Auto-login for private license
- [x] Fetch interceptor for API calls
- [x] Figma import foundation (.fig parsing)
- [x] .kizuku file format

### In Progress
- [ ] Figma import UI and full conversion
- [ ] Dashboard without Internal Error
- [ ] Project file management

### Planned
- [ ] Business license with cloud sync
- [ ] Collaboration features
- [ ] Auto-updater
- [ ] Platform installers (DMG, NSIS, AppImage)
- [ ] Performance optimizations

---

## Troubleshooting

### "Internal Error" on Dashboard
The mock backend may be missing API handlers. Check console for:
```
⚠️ Kizuku Mock Backend: Unhandled command: <command-name>
```

### Fetch Interceptor Not Working
Verify in console:
```
✅ [Kizuku Preload] Fetch interceptor installed in main world
```
If missing, check `src/preload.js` for errors.

### Mock Server Not Receiving Requests
Check that port 9999 is free:
```bash
lsof -i :9999
```

### License Not Recognized
Delete and recreate test data:
```bash
rm -rf test-data/
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

---

## License Compliance

- **PenPot Code**: MPL 2.0 - Modifications shared as required
- **Kizuku Wrapper**: MIT License
- **Documentation**: CC BY 4.0

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow linting rules (`npm run lint`)
4. Commit with descriptive messages
5. Push and open a Pull Request

---

## Acknowledgments

Built on the amazing work of the [PenPot](https://penpot.app) team. Kizuku extends PenPot for offline desktop use while respecting the open-source license.
