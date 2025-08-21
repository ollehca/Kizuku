# 🎨 PenPot Desktop - Cheat Sheet

## ⚡ Essential Commands

```bash
# Start everything (main command)
./start-dev-environment.sh

# Fix problems automatically
./scripts/health-check.sh --repair

# Emergency reset (nuclear option)
./scripts/maintenance.sh reset
./start-dev-environment.sh
```

## 🔑 Demo Login
- **Email**: `demo@penpot.local`
- **Password**: `demo123`

## 🆘 Quick Fixes

| Problem | Solution |
|---------|----------|
| 404 Error | `./scripts/health-check.sh --repair` |
| Demo Login Fails | `./scripts/create-demo-simple.sh` |
| App Won't Start | `./start-dev-environment.sh` |
| Everything Broken | `./scripts/maintenance.sh reset` |

## 📱 Desktop App Help Menu
- **Run Health Check** - Check status
- **Emergency Recovery** - Full restart
- **Recovery Status** - View info

## 📁 Important Files
- `README.md` - Main guide
- `CLAUDE.md` - Complete docs
- `scripts/TROUBLESHOOTING.md` - Fix problems

## ✅ Success Signs
```
✅ Frontend status: true
✅ PenPot app detected: true
✅ Server running: true
✅ All systems are healthy!
```

## 🔄 Daily Workflow
1. Run `./start-dev-environment.sh`
2. Wait for ✅ green checkmarks
3. Login with demo credentials
4. Start designing! 🎨

---
**Remember: One command solves most problems!**
**`./start-dev-environment.sh`** 🎯