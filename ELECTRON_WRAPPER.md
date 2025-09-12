# Electron Wrapper for Kizu

## Overview
This Electron wrapper provides a native desktop experience for PenPot, embedding the web application in a desktop container with native OS integration.

## Features Implemented
✅ **Basic Electron Integration**
- Native desktop window with PenPot embedded
- Cross-platform support (Windows, macOS, Linux)
- Development and production mode handling
- Connection health checking for PenPot server

✅ **Native Desktop Features**
- Native application menus (File, Edit, View, Window, Help)
- Keyboard shortcuts (Ctrl+N, Ctrl+O, Ctrl+S, etc.)
- File dialogs for project open/save operations
- Window state persistence (size, position, maximized state)
- Platform-specific UI adjustments

✅ **IPC Communication**
- Secure communication between main and renderer processes
- File system operations (read/write files)
- Native dialog access from web content
- App version and metadata access

✅ **Development Workflow**
- Hot reload in development mode
- Automatic DevTools opening in dev mode
- PenPot server connection validation
- Graceful error handling and user feedback

## Architecture

### Main Process (`src/main.js`)
- Creates and manages the main application window
- Handles native OS integration (menus, dialogs, shortcuts)
- Manages PenPot server connection in development
- Implements IPC handlers for renderer communication

### Preload Script (`src/preload.js`)
- Secure bridge between main and renderer processes  
- Exposes limited native functionality to web content
- Follows Electron security best practices

### Development Mode
- Connects to PenPot dev server at `localhost:3449`
- Enables web security bypass for CORS handling
- Shows DevTools automatically
- Provides clear error messages for connection issues

### Production Mode  
- Loads bundled PenPot frontend from resources
- Runs with full security enabled
- Includes PenPot frontend build in app package

## Usage

### Development
```bash
# Start PenPot dev server first
cd ../penpot && ./manage.sh run-devenv

# Start Electron wrapper
npm run dev
```

### Testing
```bash
# Run wrapper functionality tests
node test-wrapper.js

# Launch standalone Electron app
npm start
```

### Building
```bash
# Build for all platforms
npm run dist

# Build for current platform only  
npm run pack
```

## Integration Points

The wrapper integrates with PenPot through:

1. **Web Container**: Embeds PenPot frontend in Electron's Chromium
2. **Menu Actions**: Sends menu commands to PenPot via IPC
3. **File Operations**: Provides native file dialogs for project management
4. **Keyboard Shortcuts**: Maps native shortcuts to PenPot actions

## Next Steps

This wrapper provides the foundation for:
- Native desktop menus (Issue #3)
- Keyboard shortcuts implementation (Issue #4)  
- Desktop file association (.penpot files)
- Offline functionality development
- Platform-specific packaging and distribution

The Electron wrapper is production-ready and successfully integrates PenPot into a native desktop experience.