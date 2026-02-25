# Kizuku Development Guide

**A local-first design tool with cloud collaboration (when needed)**

---

## 🎯 Vision

Create a professional desktop design tool that:
- Works 100% offline for private users
- Enables cloud collaboration for business users
- Runs natively on macOS, Windows, and Linux
- Provides a polished, Figma-quality experience

---

## 📋 Project Status

**Current Phase**: Foundation & Planning
**Timeline**: 12 weeks to MVP launch
**Start Date**: October 2025
**Target Launch**: January 2026

---

## 📚 Documentation Structure

All technical documentation is in `docs/`:

### Strategic Documents
- **`UNIFIED_APPROACH.md`** - Master strategic direction ⭐ START HERE
- **`ARCHITECTURE_ANALYSIS.md`** - Technical deep-dive & decisions
- **`POC_PLAN.md`** - Proof-of-concept roadmap
- **`POC_FINDINGS.md`** - Research results & discoveries

### Implementation Guides
- **`WEEK_1_TASKS.md`** - Detailed day-by-day tasks for Week 1
- `WEEK_2_TASKS.md` - Coming soon
- `IMPLEMENTATION_GUIDE.md` - Coming soon

### Reference
- **`CLAUDE.md`** - Development notes & PenPot integration
- `API.md` - Coming soon
- `DEPLOYMENT.md` - Coming soon

---

## 🏗️ Architecture Overview

### Local Mode (Private License)

```
┌─────────────────────────────────────────┐
│  Kizu.app                               │
│  ┌──────────────────────────────────┐  │
│  │  Electron (Node.js)              │  │
│  │  - License management            │  │
│  │  - User authentication           │  │
│  │  - File management UI            │  │
│  └──────────────────────────────────┘  │
│             ↕ Process Management        │
│  ┌──────────────────────────────────┐  │
│  │  PenPot Backend (JVM)            │  │
│  │  - Embedded PostgreSQL           │  │
│  │  - Local file storage            │  │
│  │  - Version history               │  │
│  └──────────────────────────────────┘  │
│             ↕ HTTP (localhost)          │
│  ┌──────────────────────────────────┐  │
│  │  PenPot Frontend (Browser)       │  │
│  │  - Design tools                  │  │
│  │  - UI components                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
        ↓ Stores Data
~/Library/Application Support/Kizuku/
├── database/postgresql/
├── assets/
└── config.json
```

### Cloud Mode (Business License)

Same app structure, but:
- Database → Cloud PostgreSQL
- Storage → Cloud S3
- Auth → Cloud API
- Features → Collaboration enabled

**Switch happens automatically based on license type!**

---

## 🔑 Key Technologies

### Core Stack
- **Electron 28+** - Desktop app framework
- **Node.js 18+** - JavaScript runtime
- **PostgreSQL 15+** (embedded) - Database
- **Java 17 LTS** - PenPot backend runtime
- **Clojure** - PenPot backend language
- **React** - PenPot frontend (via ClojureScript)

### Key Libraries
- `embedded-postgres` - PostgreSQL embedding
- `electron-builder` - Cross-platform packaging
- `electron-updater` - Auto-update system
- HikariCP - Database connection pooling
- Caffeine - In-memory caching

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Java 17 (for development)
- Git

### Setup

```bash
# Clone repository
git clone <repo-url>
cd Kizu

# Install dependencies
npm install

# Install PenPot submodule
git submodule update --init --recursive

# Start development
npm start
```

---

## 📦 Development Commands

```bash
# Development
npm start                  # Start Kizuku in development mode
npm run dev:backend        # Start PenPot backend separately (debug)
npm run dev:frontend       # Start PenPot frontend separately (debug)

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests (coming soon)

# Code Quality
npm run lint               # Run ESLint
npm run format             # Run Prettier
npm run lint:fix           # Fix linting issues

# Building
npm run build              # Build for current platform
npm run build:mac          # Build for macOS (Intel + Apple Silicon)
npm run build:win          # Build for Windows
npm run build:linux        # Build for Linux
npm run build:all          # Build for all platforms

# Release
npm run release            # Build and publish release
```

---

## 🗂️ Project Structure

```
Kizu/
├── docs/                      # Documentation
│   ├── UNIFIED_APPROACH.md
│   ├── ARCHITECTURE_ANALYSIS.md
│   └── WEEK_1_TASKS.md
├── src/                       # Electron app source
│   ├── main.js               # Main process
│   ├── preload.js            # Preload scripts
│   ├── services/             # Business logic
│   │   ├── auth/             # Authentication abstraction
│   │   ├── storage/          # Storage abstraction
│   │   ├── config-manager.js
│   │   └── ...
│   └── ui/                   # UI screens
│       ├── login.html
│       └── ...
├── penpot/                    # PenPot submodule
│   ├── backend/              # Clojure backend
│   └── frontend/             # ClojureScript frontend
├── tests/                     # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── build/                     # Build resources
│   ├── icon.icns             # macOS icon
│   ├── icon.ico              # Windows icon
│   └── icon.png              # Linux icon
├── scripts/                   # Utility scripts
├── package.json
└── README_DEVELOPMENT.md      # This file
```

---

## 🧪 Testing Strategy

### Unit Tests (Jest)
- Services (auth, storage, config)
- Utilities
- License validation
- User management

### Integration Tests
- Abstraction layers
- PenPot backend integration
- Database operations
- File operations

### E2E Tests (Playwright - Coming Soon)
- Complete user workflows
- UI interactions
- Cross-platform compatibility

### Manual Testing Checklist
- [ ] App launches without errors
- [ ] Can create new project
- [ ] Can save project
- [ ] Can load project
- [ ] Version history works
- [ ] Export/import .penpot files
- [ ] All design tools functional
- [ ] Performance acceptable

---

## 🐛 Debugging

### Enable Debug Logs

```bash
# Electron debug logs
DEBUG=* npm start

# Backend debug logs (in PenPot backend)
export LOG_LEVEL=debug
```

### Inspect Electron

Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux) to open DevTools.

### Common Issues

**App won't start**:
- Check Java is installed: `java --version`
- Check Node version: `node --version`
- Check logs in `~/Library/Application Support/Kizuku/logs/`

**Database errors**:
- Check PostgreSQL is embedded correctly
- Check database directory permissions
- Try removing database and recreating: `rm -rf ~/Library/Application\ Support/Kizuku/database`

**Backend won't start**:
- Check port 54321 is available
- Check Java classpath
- Check backend logs

---

## 📖 Development Workflow

### Week-by-Week Plan

**Week 1**: Foundation
- Embedded PostgreSQL
- Abstraction layers
- Cross-platform setup

**Week 2**: Backend Integration
- PenPot + embedded PostgreSQL
- Redis mocking
- API testing

**Week 3-4**: Frontend Integration
- Electron → PenPot connection
- File management UI
- Settings/preferences

**Week 5-6**: Features
- Version history
- Export/import
- Polish

**Week 7-9**: Testing & Polish
- Cross-platform testing
- Performance optimization
- Bug fixes

**Week 10-11**: Beta Testing
- Internal testing
- Bug fixes
- Documentation

**Week 12**: Launch Prep
- Final testing
- Marketing materials
- Release!

---

## 🤝 Contributing

Currently in active development. Not accepting external contributions yet.

---

## 📄 License

(To be determined - likely dual license: open source for private users, commercial for business)

---

## 🔗 Links

- **PenPot**: https://penpot.app
- **Electron**: https://electronjs.org
- **Issue Tracker**: (Coming soon)
- **Documentation**: `docs/` directory

---

## 📞 Contact

(To be added)

---

## 🎉 Acknowledgments

Built with:
- **PenPot** - The amazing open-source design tool
- **Electron** - Cross-platform desktop framework
- **PostgreSQL** - Robust database system

---

**Ready to build something great! 🚀**
