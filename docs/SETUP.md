# PenPot Desktop Development Setup Guide

## Overview

This guide will help you set up the complete development environment for PenPot Desktop. The project consists of two main components:

1. **PenPot Core**: The original PenPot application (ClojureScript frontend + Clojure backend)
2. **Electron Desktop App**: The desktop wrapper providing offline capabilities and native integration

## Prerequisites

### System Requirements

- **macOS 10.15+**, **Windows 10+**, or **Ubuntu 18.04+**
- **Node.js v22.13.1** (as specified in PenPot's .nvmrc)
- **Docker Desktop** with Docker Compose V2
- **Git** for version control
- **Java 11+** (for Clojure backend)

### Development Tools (Recommended)

- **Visual Studio Code** with Clojure extensions
- **Postman** or **Insomnia** for API testing
- **Docker Desktop** GUI for container management

## Step-by-Step Setup

### 1. Clone Repositories

```bash
# Create main project directory
mkdir PenPotDesktop && cd PenPotDesktop

# Clone PenPot core (original)
git clone https://github.com/penpot/penpot.git

# Clone desktop wrapper (this project)
git clone https://github.com/your-username/penpot-desktop.git
```

### 2. Set up Node.js Environment

```bash
# Check Node.js version (should be v22.13.1+)
node --version

# If using NVM, set correct version
nvm use v22.13.1

# Verify Docker is running
docker --version
docker compose version
```

### 3. Set up PenPot Core Development Environment

```bash
cd penpot

# Pull the development environment Docker image
./manage.sh pull-devenv

# Start the development environment
# This will start PostgreSQL, Redis, MinIO, and other services
./manage.sh run-devenv
```

**Note**: The `run-devenv` command will:
- Start all required services (database, storage, etc.)
- Launch a tmux session with frontend and backend servers
- Make PenPot available at http://localhost:3449

### 4. Set up Electron Desktop App

```bash
cd ../penpot-desktop

# Install dependencies
npm install

# Start development mode
npm run dev
```

## Development Workflow

### Daily Development Process

1. **Start Docker Services** (if not running):
   ```bash
   cd penpot
   ./manage.sh run-devenv
   ```

2. **Start Electron App**:
   ```bash
   cd penpot-desktop
   npm run dev
   ```

3. **Development URLs**:
   - PenPot Web: http://localhost:3449
   - PenPot Backend API: http://localhost:6060
   - MinIO Storage: http://localhost:9001
   - Electron Desktop App: Launches automatically

### Testing Your Setup

1. **Verify PenPot Web Interface**:
   - Open http://localhost:3449 in browser
   - Register/login to create account
   - Create a test project

2. **Verify Electron App**:
   - Desktop app should launch and load PenPot interface
   - Test file menu operations
   - Verify native shortcuts work (Cmd+N, Cmd+O, etc.)

## Architecture Understanding

### PenPot Core Components

```
penpot/
├── frontend/src/app/          # ClojureScript frontend
│   ├── main.cljs             # Main entry point
│   ├── config.cljs           # Configuration
│   └── main/ui/              # UI components
├── backend/src/app/           # Clojure backend
│   ├── main.clj              # Backend entry point
│   ├── rpc/                  # API endpoints
│   └── http/                 # HTTP server
├── common/src/app/common/     # Shared code
└── docker/                   # Docker configurations
```

### Key Files for Desktop Integration

1. **Frontend Entry Point**: `frontend/src/app/main.cljs`
   - Main application initialization
   - Configuration loading
   - UI framework setup

2. **Configuration**: `frontend/src/app/config.cljs`
   - Platform detection
   - Feature flags
   - Public URI configuration

3. **Build Configuration**: `frontend/shadow-cljs.edn`
   - ClojureScript compilation
   - Module definitions
   - Build targets

### Electron Desktop Structure

```
penpot-desktop/
├── src/
│   ├── main.js               # Electron main process
│   ├── preload.js           # Secure IPC bridge
│   └── renderer.js          # Additional renderer logic
├── assets/                   # Icons and resources
└── package.json             # Electron configuration
```

## Key Integration Points

### 1. Frontend Loading
- **Development**: Electron loads `http://localhost:3449`
- **Production**: Electron loads bundled frontend from `resources/public`

### 2. Backend Communication  
- Desktop app communicates with local PenPot backend at `http://localhost:6060`
- Same REST API as web version
- WebSocket support for real-time features

### 3. File System Integration
- Native file dialogs for save/open operations
- Direct file system access via IPC
- Future: Custom .penpot file format

### 4. Desktop-Specific Features
- Native application menus
- Keyboard shortcuts
- Window state persistence
- Future: Offline storage, auto-updates

## Troubleshooting

### Docker Issues

**Problem**: Docker daemon not running
```bash
# macOS
open -a Docker

# Or start via command line
sudo systemctl start docker
```

**Problem**: Port conflicts
```bash
# Check what's using port 3449
lsof -i :3449

# Stop conflicting services or change ports in config
```

### PenPot Development Environment

**Problem**: manage.sh script fails
```bash
# Make sure you're in the penpot directory
cd penpot

# Check Docker is running
docker info

# Try rebuilding development environment
./manage.sh build-devenv
./manage.sh run-devenv
```

**Problem**: Frontend not loading
```bash
# Check if tmux session is running
docker exec penpot-devenv-main tmux list-sessions

# Restart development environment
./manage.sh stop-devenv
./manage.sh run-devenv
```

### Electron Issues

**Problem**: App won't start
```bash
# Check Node.js version
node --version  # Should be v22.13.1+

# Reinstall dependencies
rm -rf node_modules
npm install

# Start in verbose mode
DEBUG=* npm run dev
```

**Problem**: PenPot not loading in Electron
- Verify PenPot development server is running at localhost:3449
- Check browser console in Electron DevTools (Cmd+Option+I)
- Verify no CORS issues in network tab

## Development Tips

### 1. Hot Reloading
- **PenPot Frontend**: Auto-reloads via shadow-cljs
- **Electron**: Use `nodemon` for main process reload
- **Backend**: Clojure REPL for live development

### 2. Debugging
- **Frontend**: Browser DevTools in Electron
- **Backend**: Connect to Clojure REPL
- **Electron**: Node.js debugging tools

### 3. Performance
- Use production builds for performance testing
- Monitor memory usage with Electron DevTools
- Profile ClojureScript compilation times

## Next Steps

After successful setup:

1. **Explore PenPot Codebase**: Understand the component architecture
2. **Test Desktop Features**: Verify file operations and native integration
3. **Plan Desktop Modifications**: Identify areas needing desktop-specific changes
4. **Implement Offline Storage**: Replace cloud storage with local alternatives
5. **Create Distribution Builds**: Package for different platforms

## Team Onboarding

For new team members:

1. Follow this setup guide completely
2. Create test project in both web and desktop versions
3. Familiarize with PenPot architecture documentation
4. Review Electron main process and preload scripts
5. Test development workflow end-to-end

## Support

If you encounter issues:
1. Check this troubleshooting section
2. Search existing GitHub issues
3. Create new issue with setup environment details
4. Join team Slack/Discord for quick help

---

**Setup Time**: Allow 1-2 hours for complete setup
**Update Frequency**: Check for updates weekly
**Maintenance**: Docker containers should be restarted weekly