# Kizuku Backend Architecture

## Core Principle
**Kizuku wraps PenPot's design tooling, NOT its backend services.**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ KIZUKU DESKTOP APP (Electron)                             │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Kizuku Services Layer                                │  │
│ │ ├── License Validation ✅                          │  │
│ │ ├── Local User Management ✅                       │  │
│ │ ├── Local File Storage ✅                          │  │
│ │ └── Mock Backend (for PenPot) ← TO BUILD          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ PenPot Editor (Frontend Only)                      │  │
│ │ ├── Design Canvas                                  │  │
│ │ ├── Figma Import                                   │  │
│ │ ├── File Format (.penpot)                          │  │
│ │ └── UI Components                                  │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Required PenPot Backend APIs (To Mock)

### Authentication (Mock for All Users)
- `login-with-password` → Always succeed with mock profile
- `logout` → Clear local session
- `fetch-profile` → Return mock Kizuku user profile

### File Operations (Route to Local Filesystem)
- `get-file-data-for-thumbnail` → Local file read
- File save/load → Local .penpot files
- File list → Local directory scan

### Optional/Ignore
- `push-audit-events` → Ignore (analytics)
- Team/collaboration APIs → Mock or ignore (private license)

## Implementation Plan

### Phase 1: Mock Backend Layer ← CURRENT
Create `src/services/penpot-mock-backend.js`:
- Intercept all `rp/cmd!` calls
- Return mock responses for auth
- Route file operations to local filesystem
- No actual PenPot backend needed

### Phase 2: Local File Storage
Integrate with existing Kizuku file management:
- .penpot files stored in user's Documents/Kizuku/Projects
- Thumbnail generation using local resources
- No database needed (files = projects)

### Phase 3: Production Build
- Remove PenPot backend from packaged app
- PenPot backend only for development/testing
- 100% offline functionality

## Future: Business/Collab Licenses
When ready for cloud features:
- **Kizuku Cloud Backend** (our own, not PenPot's)
- Real-time collaboration via Kizuku servers
- Team management via Kizuku services
- File sync via Kizuku storage

**PenPot backend will NEVER be required in production.**
