# 🚀 PenPot Desktop - Quick Start Guide

## ⚡ Fastest Way to Start

```bash
./start-dev-environment.sh
```

**That's it!** This command does everything automatically.

---

## 🔑 Demo Login

Once the app opens:
- **Email**: `demo@penpot.local`
- **Password**: `demo123`

---

## 🆘 If Something Goes Wrong

### Quick Fixes
```bash
# Auto-repair everything
./scripts/health-check.sh --repair

# Check what's broken
./scripts/health-check.sh

# Reset everything (nuclear option)
./scripts/maintenance.sh reset
./start-dev-environment.sh
```

### Desktop App Help Menu
- **Run Health Check** - Check system status
- **Emergency Recovery** - Full restart
- **Recovery Status** - View recovery info

---

## 📁 Script Guide

| Script | What it does |
|--------|--------------|
| `./start-dev-environment.sh` | **🎯 Start everything** |
| `./scripts/health-check.sh` | Check & repair system |
| `./scripts/create-demo-simple.sh` | Create demo account |
| `./scripts/maintenance.sh` | Backup & cleanup |

---

## ✅ Success = Green Checkmarks

When you see these, everything is working:
```
✅ Frontend status: true
✅ PenPot app detected: true  
✅ Server running: true
✅ Header bar creation completed
```

---

## 🔄 Daily Workflow

1. Run `./start-dev-environment.sh`
2. Wait for green checkmarks
3. Desktop app opens automatically
4. Login with demo credentials
5. Start designing! 🎨

---

**Need more help? Check `README.md` or `CLAUDE.md`**