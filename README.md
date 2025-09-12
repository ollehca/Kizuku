# 🎨 Kizu

**Professional desktop application for PenPot design platform**

## 🚀 Quick Start

### One-Command Setup (Recommended)
```bash
./start-dev-environment.sh
```
This automatically:
- ✅ Starts all PenPot services
- ✅ Creates demo account
- ✅ Validates everything works
- ✅ Launches desktop app

### Demo Credentials
- **Email**: `demo@penpot.local`
- **Password**: `demo123`

---

## 🔧 Manual Commands

### If Quick Start Fails
```bash
# Check what's wrong
./scripts/health-check.sh

# Fix issues automatically  
./scripts/health-check.sh --repair

# Create demo account only
./scripts/create-demo-simple.sh

# Start desktop app
npm start
```

### Troubleshooting
```bash
# Emergency reset (if everything breaks)
./scripts/health-check.sh --repair
./start-dev-environment.sh

# Check system health
./scripts/health-check.sh --quick

# Backup your data
./scripts/maintenance.sh backup-all
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `start-dev-environment.sh` | **🎯 Main startup script** |
| `scripts/health-check.sh` | System health & auto-repair |
| `scripts/create-demo-simple.sh` | Demo account creation |
| `scripts/maintenance.sh` | Backup & maintenance |
| `CLAUDE.md` | **📚 Complete documentation** |

---

## 🆘 Common Issues

### ❌ Desktop App Shows 404 Error
```bash
./scripts/health-check.sh --repair
```

### ❌ Demo Login Doesn't Work  
```bash
./scripts/create-demo-simple.sh
```

### ❌ Services Won't Start
```bash
cd ../penpot
./manage.sh drop-devenv
./manage.sh start-devenv
./start-dev-environment.sh
```

### ❌ Everything is Broken
```bash
./scripts/maintenance.sh reset
./start-dev-environment.sh
```

---

## 🎯 Development Workflow

### Daily Routine
1. **Start**: `./start-dev-environment.sh`
2. **Work**: Use demo credentials to log in
3. **Check**: Desktop app Help menu → "Run Health Check"

### Before Making Changes
1. **Backup**: `./scripts/maintenance.sh backup-all`
2. **Health Check**: `./scripts/health-check.sh`

### If Issues Occur
1. **Auto-repair**: Desktop app Help menu → "Run Health Check" 
2. **Manual repair**: `./scripts/health-check.sh --repair`
3. **Emergency**: Desktop app Help menu → "Emergency Recovery"

---

## 📱 Desktop App Features

### Automatic Recovery (Built-in)
- 🔄 Monitors health every 2 minutes
- 🛠️ Auto-repairs missing files
- 🚨 Emergency recovery option
- 📊 Status tracking

### Help Menu Options
- **Run Health Check** - Check system status
- **Emergency Recovery** - Full system restart  
- **Recovery Status** - View recovery info

---

## 📚 Need More Help?

- **Complete Guide**: Read `CLAUDE.md`
- **Health Issues**: Run `./scripts/health-check.sh`
- **Data Problems**: Use `./scripts/maintenance.sh`
- **Demo Account**: Try `./scripts/create-demo-simple.sh`

---

## 🎉 Success Indicators

When everything works:
- ✅ Desktop app opens without errors
- ✅ Can log in with `demo@penpot.local / demo123`
- ✅ PenPot interface loads completely
- ✅ No 404 errors in console

**Happy designing! 🎨**

---

## Development Setup (Original)

## Architecture

Kizu consists of:

- **Electron Main Process** (`src/main.js`): Application window management, file system access, and native OS integration
- **Renderer Process**: The PenPot web application running in Chromium
- **Preload Script** (`src/preload.js`): Secure bridge between main and renderer processes
- **PenPot Backend**: Local server providing API and data persistence

## File Structure

```
kizu/
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
- macOS: `~/Library/Application Support/Kizu/`
- Windows: `%APPDATA%/Kizu/`
- Linux: `~/.config/Kizu/`

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