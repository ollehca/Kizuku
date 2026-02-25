# Kizuku Architecture

## Overview

Kizuku is built as a hybrid application that combines the existing PenPot web application with Electron to provide desktop-specific features and offline capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Kizuku                                │
├─────────────────────────────────────────────────────────────┤
│  Electron Main Process                                      │
│  ├── Window Management                                      │
│  ├── Native Menus & Shortcuts                              │
│  ├── File System Access                                     │
│  └── Auto Updater                                          │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (Chromium)                               │
│  ├── PenPot ClojureScript Frontend                         │
│  ├── Desktop-specific UI Modifications                     │
│  └── IPC Bridge (Preload Script)                          │
├─────────────────────────────────────────────────────────────┤
│  Local Backend Services                                     │
│  ├── PenPot Clojure Backend                               │
│  ├── Local Database (SQLite/PostgreSQL)                   │
│  ├── File Storage (Local FS)                              │
│  └── Asset Management                                      │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Electron Main Process (`src/main.js`)

**Responsibilities:**
- Application lifecycle management
- Window creation and state management
- Native OS integration (menus, shortcuts, notifications)
- File system operations
- Security enforcement
- Inter-process communication coordination

**Key Features:**
- Native file dialogs for save/open operations
- Window state persistence
- Platform-specific menu creation
- External URL handling
- Development/production mode handling

### 2. Preload Script (`src/preload.js`)

**Responsibilities:**
- Secure bridge between main and renderer processes
- Exposes limited Node.js APIs to renderer
- Desktop feature detection
- Security context isolation

**Exposed APIs:**
```javascript
window.electronAPI = {
  getAppVersion: () => Promise<string>,
  showSaveDialog: (options) => Promise<SaveResult>,
  showOpenDialog: (options) => Promise<OpenResult>,
  writeFile: (path, data) => Promise<WriteResult>,
  readFile: (path) => Promise<ReadResult>,
  onMenuAction: (callback) => void
}
```

### 3. PenPot Frontend Integration

**Current State:**
- Embeds existing PenPot ClojureScript frontend
- Loads from localhost:3449 in development
- Loads from bundled resources in production

**Desktop Modifications Needed:**
- Override file operations to use native dialogs
- Replace cloud storage calls with local storage
- Modify authentication for offline mode
- Add desktop-specific UI elements

**Key Files to Modify:**
```
penpot/frontend/src/app/
├── config.cljs              # Add desktop platform detection
├── main/data/
│   ├── auth.cljs           # Offline authentication
│   ├── dashboard.cljs      # File management integration
│   ├── persistence.cljs    # Local storage backend
│   └── websocket.cljs      # Optional: disable for offline
└── main/ui/
    ├── dashboard/          # File browser integration
    ├── workspace/          # Desktop shortcuts
    └── settings/           # Desktop preferences
```

### 4. Backend Services

**Development Mode:**
- Uses existing PenPot Docker development environment
- PostgreSQL database
- MinIO for file storage
- Redis for sessions

**Production Mode (Future):**
- Local SQLite database
- Local file system storage
- In-memory session management
- Optional: Embedded PostgreSQL

## Data Flow

### File Operations

```
User Action (Save/Open)
       ↓
Native Menu/Shortcut
       ↓
Main Process (main.js)
       ↓
Show Native Dialog
       ↓
IPC to Renderer
       ↓
PenPot Frontend
       ↓
Local Backend API
       ↓
Local Storage/Database
```

### Project Management

```
PenPot UI (Create Project)
       ↓
Frontend State Management
       ↓
API Call to Backend
       ↓
Local Database Storage
       ↓
File System Persistence
       ↓
Desktop File Association
```

## Storage Architecture

### Current (Development)
```
Docker Environment
├── PostgreSQL (Projects, Users, Teams)
├── MinIO (Media Files, Assets)
├── Redis (Sessions, Cache)
└── Local Files (Temp, Uploads)
```

### Target (Production Desktop)
```
Local Desktop Storage
├── SQLite Database
│   ├── Projects & Pages
│   ├── User Profiles
│   ├── Design Assets
│   └── Application Settings
├── File System
│   ├── Project Files (.penpot)
│   ├── Exported Assets
│   ├── Media Library
│   └── Thumbnails/Cache
└── Application Data
    ├── User Preferences
    ├── Window State
    └── Recent Files
```

## Security Model

### Electron Security
- **Context Isolation**: Enabled to prevent code injection
- **Node Integration**: Disabled in renderer for security
- **Preload Script**: Only mechanism for main-renderer communication
- **CSP Headers**: Content Security Policy enforcement
- **External URL Handling**: Prevent navigation to malicious sites

### Data Security
- **Local Storage**: All data stored locally, no cloud sync
- **File Permissions**: Respect OS file system permissions
- **Encryption**: Future consideration for sensitive project data

## Build Process

### Development Build
```
npm run dev
├── Start PenPot Development Environment
├── Launch Electron with DevTools
├── Enable Hot Reloading
└── Connect to localhost:3449
```

### Production Build
```
npm run build
├── Build PenPot Frontend (shadow-cljs)
├── Bundle Static Assets
├── Package Electron App
├── Create Platform Installers
└── Code Signing (Release)
```

## Platform-Specific Considerations

### macOS
- **Title Bar**: Hidden inset style for native look
- **Menus**: Native application menu in menu bar
- **File Associations**: Register .penpot file type
- **Packaging**: DMG installer with code signing
- **Architecture**: Universal binary (Intel + Apple Silicon)

### Windows
- **Title Bar**: Standard Windows chrome
- **Menus**: In-application menu bar
- **File Associations**: Registry entries for .penpot files
- **Packaging**: NSIS installer with code signing
- **Architecture**: x64 builds

### Linux
- **Title Bar**: Standard with window controls
- **Menus**: In-application menu bar
- **File Associations**: Desktop file entries
- **Packaging**: AppImage for universal distribution
- **Architecture**: x64 builds

## Performance Considerations

### Memory Management
- **Electron Overhead**: ~100MB base memory usage
- **PenPot Frontend**: ClojureScript compiled size ~2MB
- **Backend Services**: Local PostgreSQL ~50MB
- **Total Estimate**: ~200-300MB for basic usage

### Startup Performance
- **Cold Start**: ~3-5 seconds (including backend)
- **Warm Start**: ~1-2 seconds (cached resources)
- **Optimization**: Preload critical resources, lazy load modules

### Storage Performance
- **Local Database**: SQLite for fast queries
- **File System**: Direct FS access for media
- **Caching**: Thumbnail and preview caching
- **Indexing**: Full-text search on project content

## Future Enhancements

### Phase 2 Features
- **Offline Sync**: Sync with cloud when online
- **Plugin System**: Desktop-specific plugins
- **Advanced File Formats**: Import/export additional formats
- **Collaboration**: Local network sharing
- **Performance**: Native code optimizations

### Phase 3 Features
- **Multi-Window**: Multiple project windows
- **Version Control**: Git integration for projects
- **Cloud Integration**: Optional cloud backup
- **Advanced Tools**: Desktop-specific design tools

## Development Guidelines

### Code Organization
```
kizuku/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # Desktop-specific renderer code  
│   └── shared/         # Shared utilities
├── penpot-patches/     # Modifications to PenPot core
├── assets/             # Icons, resources
└── scripts/            # Build and deployment scripts
```

### Testing Strategy
- **Unit Tests**: Jest for JavaScript components
- **Integration Tests**: Spectron for Electron integration
- **E2E Tests**: Playwright for full application testing
- **Performance Tests**: Memory and startup benchmarks

### Deployment Pipeline
- **CI/CD**: GitHub Actions for automated builds
- **Code Signing**: Platform-specific signing certificates
- **Distribution**: GitHub Releases and auto-updater
- **Telemetry**: Optional usage analytics

## Technical Debt Considerations

### Current Limitations
- Development environment requires Docker
- Production build needs backend service bundling
- Limited offline functionality in current state
- No custom file format yet

### Refactoring Opportunities
- Extract PenPot core into embeddable library
- Implement proper offline storage layer
- Create desktop-specific UI components
- Optimize bundle size and startup time