# PenPot Desktop

Professional offline design tool based on the open-source PenPot design platform.

## Overview

PenPot Desktop brings the power of PenPot to your desktop with offline capabilities, enhanced performance, and native desktop integration. Built on Electron, it provides a seamless design experience without requiring an internet connection.

## Features

- **Offline Design**: Work on your projects without internet connection
- **Native File System**: Direct file save/load operations
- **Desktop Integration**: Native menus, shortcuts, and OS integration
- **Enhanced Performance**: Optimized for desktop usage
- **Cross-Platform**: Available for macOS, Windows, and Linux
- **Auto-Updates**: Seamless updates (coming soon)

## Development Setup

### Prerequisites

- Node.js (v22.13.1 or later)
- Docker and Docker Compose V2
- Git

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/penpot-desktop.git
   cd penpot-desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up PenPot development environment:**
   ```bash
   cd ../penpot
   ./manage.sh pull-devenv
   ./manage.sh run-devenv
   ```

4. **Start the desktop application:**
   ```bash
   npm run dev
   ```

## Architecture

PenPot Desktop consists of:

- **Electron Main Process** (`src/main.js`): Application window management, file system access, and native OS integration
- **Renderer Process**: The PenPot web application running in Chromium
- **Preload Script** (`src/preload.js`): Secure bridge between main and renderer processes
- **PenPot Backend**: Local server providing API and data persistence

## File Structure

```
penpot-desktop/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script for renderer
│   └── renderer.js      # Additional renderer logic (if needed)
├── assets/              # Application icons and assets
├── docs/                # Documentation
├── package.json         # Project configuration
└── README.md           # This file
```

## Build Process

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run dist
```

### Package for Distribution
```bash
npm run pack        # Create unpacked builds
npm run dist        # Create installers
```

## Desktop Integration Features

### File Operations
- Native file dialogs for open/save operations
- Direct file system access for project files
- Support for .penpot file format

### Menu Integration
- Native application menus
- Keyboard shortcuts
- Context menus

### Platform-Specific Features
- macOS: Hidden title bar, proper window management
- Windows: NSIS installer, Windows-specific shortcuts  
- Linux: AppImage distribution

## PenPot Integration

The desktop app integrates with PenPot by:

1. **Frontend**: Embedding the PenPot ClojureScript frontend in an Electron webview
2. **Backend**: Running a local PenPot backend server for API and data persistence
3. **Storage**: Using local SQLite instead of PostgreSQL for offline capability
4. **Assets**: Local file storage instead of cloud storage

## Configuration

Configuration is stored in the user's data directory:
- macOS: `~/Library/Application Support/PenPot Desktop/`
- Windows: `%APPDATA%/PenPot Desktop/`
- Linux: `~/.config/PenPot Desktop/`

## License Compliance

This project is built on PenPot's MPL 2.0 licensed codebase. All modifications to MPL-licensed files will be shared as required. The Electron wrapper and desktop-specific code are licensed under MIT.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [x] Basic Electron application setup
- [x] PenPot frontend integration
- [ ] Local backend server integration
- [ ] Offline file storage system
- [ ] Native file format support
- [ ] Auto-updater implementation
- [ ] Performance optimizations
- [ ] Platform-specific installers

## Support

For support and questions:
- Create an issue on GitHub
- Join our community discussions
- Check the documentation in `/docs`

## Acknowledgments

Built on the amazing work of the PenPot team and community. Special thanks to the open-source design tools ecosystem.