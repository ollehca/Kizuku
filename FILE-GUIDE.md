# 📁 PenPot Desktop - File Guide

## 🎯 Start Here Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **[GETTING-STARTED.md](GETTING-STARTED.md)** | 🚀 **Main entry point** | **READ THIS FIRST** |
| **[README.md](README.md)** | 📖 **User guide with examples** | Daily reference |
| **[CHEAT-SHEET.md](CHEAT-SHEET.md)** | ⚡ **Quick commands** | Keep open while working |

---

## 🔧 Scripts & Commands

| File | Purpose | Example Use |
|------|---------|-------------|
| **`start-dev-environment.sh`** | 🎯 **Main startup script** | `./start-dev-environment.sh` |
| `scripts/health-check.sh` | 🏥 Health monitoring | `./scripts/health-check.sh --repair` |
| `scripts/create-demo-simple.sh` | 👤 Demo account | `./scripts/create-demo-simple.sh` |
| `scripts/maintenance.sh` | 💾 Backup & cleanup | `./scripts/maintenance.sh backup-all` |

---

## 📚 Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| **[scripts/QUICK-START.md](scripts/QUICK-START.md)** | ⚡ **5-minute guide** | **Beginners** |
| **[scripts/TROUBLESHOOTING.md](scripts/TROUBLESHOOTING.md)** | 🆘 **Problem solving** | **When things break** |
| **[scripts/SCRIPTS-GUIDE.md](scripts/SCRIPTS-GUIDE.md)** | 📜 **All commands** | **Reference** |
| **[CLAUDE.md](CLAUDE.md)** | 🔬 **Complete technical docs** | **Deep dive** |

---

## ⚙️ Configuration Files

| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | NPM dependencies | Updated with recovery tools |
| `src/main.js` | Electron main process | Now includes auto-recovery |
| `src/utils/recovery.js` | Recovery system | New automated recovery |
| `../penpot/docker-compose.override.yml` | Container persistence | Data won't be lost |

---

## 📂 Directory Structure

```
PenPotDesktop/
├── 🎯 GETTING-STARTED.md          ← START HERE
├── 📖 README.md                   ← Main guide  
├── ⚡ CHEAT-SHEET.md              ← Quick reference
├── 🔬 CLAUDE.md                   ← Technical docs
├── 
├── 🚀 start-dev-environment.sh    ← Main startup
├── 
├── scripts/                       ← All utilities
│   ├── 📚 Documentation files
│   ├── 🔧 Shell scripts
│   └── 🛠️ Management tools
├── 
├── src/                          ← Source code
│   ├── main.js                   ← Enhanced with recovery
│   ├── utils/recovery.js         ← New recovery system
│   └── ...
└── 
```

---

## 🚀 Quick Navigation

### 👶 **New to PenPot Desktop?**
1. [GETTING-STARTED.md](GETTING-STARTED.md) 
2. [README.md](README.md)
3. [scripts/QUICK-START.md](scripts/QUICK-START.md)

### 🔧 **Need to Fix Something?**
1. [scripts/TROUBLESHOOTING.md](scripts/TROUBLESHOOTING.md)
2. [CHEAT-SHEET.md](CHEAT-SHEET.md)
3. `./scripts/health-check.sh --repair`

### 🛠️ **Want to Understand How It Works?**
1. [CLAUDE.md](CLAUDE.md)
2. [scripts/SCRIPTS-GUIDE.md](scripts/SCRIPTS-GUIDE.md)
3. Source code in `src/`

### 💾 **Data & Backup Management?**
1. `./scripts/maintenance.sh` commands
2. [scripts/SCRIPTS-GUIDE.md](scripts/SCRIPTS-GUIDE.md) - Maintenance section
3. `../penpot/docker-compose.override.yml`

---

## 🎨 File Color Legend

- 🎯 **Essential** - Must read/use
- 📖 **Important** - Should read
- 📚 **Reference** - Check when needed
- 🔧 **Tools** - Run when needed
- ⚙️ **Config** - Usually don't edit
- 📂 **Organization** - Directory info

---

## 🚨 Emergency Quick Reference

| Problem | File to Check |
|---------|---------------|
| Don't know where to start | [GETTING-STARTED.md](GETTING-STARTED.md) |
| App won't start | [scripts/TROUBLESHOOTING.md](scripts/TROUBLESHOOTING.md) |
| Need quick commands | [CHEAT-SHEET.md](CHEAT-SHEET.md) |
| Want to understand system | [CLAUDE.md](CLAUDE.md) |
| Scripts not working | [scripts/SCRIPTS-GUIDE.md](scripts/SCRIPTS-GUIDE.md) |

---

**Remember: Most problems are solved by running `./start-dev-environment.sh`** 🎯