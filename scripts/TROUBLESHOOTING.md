# 🔧 PenPot Desktop - Troubleshooting Guide

## 🚨 Emergency Fixes

### Everything is Broken
```bash
./scripts/maintenance.sh reset
./start-dev-environment.sh
```

### Quick Auto-Repair
```bash
./scripts/health-check.sh --repair
```

---

## ❌ Common Problems & Solutions

### Problem: Desktop App Shows 404 Error
**Cause**: Missing frontend files (config.js, debug.css)
```bash
./scripts/health-check.sh --repair
```

### Problem: Demo Login Fails
**Cause**: Demo account missing or broken
```bash
./scripts/create-demo-simple.sh
```

### Problem: "PenPot server not ready"
**Cause**: Backend services not started
```bash
cd ../penpot
./manage.sh start-devenv
./start-dev-environment.sh
```

### Problem: Containers Won't Start
**Cause**: Docker resource issues
```bash
cd ../penpot
./manage.sh drop-devenv
./start-dev-environment.sh
```

### Problem: Blank Page in Desktop App
**Cause**: Frontend not built properly
```bash
./scripts/health-check.sh --repair
```

---

## 🔍 Diagnostic Commands

### Check Everything
```bash
./scripts/health-check.sh
```

### Quick Status Check
```bash
./scripts/health-check.sh --quick
```

### Test Demo Login
```bash
curl -X POST http://localhost:6060/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@penpot.local","password":"demo123"}'
```

### Check Frontend Assets
```bash
curl -I http://localhost:3449/js/config.js
curl -I http://localhost:3449/css/debug.css
```

---

## 🐳 Docker Issues

### Check Container Status
```bash
docker ps
```

### View Container Logs
```bash
docker logs penpot-devenv-main
```

### Restart Containers
```bash
cd ../penpot
./manage.sh stop-devenv
./manage.sh start-devenv
```

### Nuclear Reset
```bash
cd ../penpot
./manage.sh drop-devenv
docker system prune -f
./start-dev-environment.sh
```

---

## 🔄 Recovery Systems

### Desktop App Built-in Recovery
- **Location**: Help menu in desktop app
- **Options**: Health Check, Emergency Recovery, Status
- **Automatic**: Runs every 2 minutes

### Manual Recovery Tools
```bash
# System health & repair
./scripts/health-check.sh --repair

# Emergency full restart  
./scripts/maintenance.sh reset

# Demo account recreation
./scripts/create-demo-simple.sh
```

---

## 🚫 When Recovery Fails

### If Scripts Don't Work
1. Check Docker is running: `docker ps`
2. Check if in correct directory: `ls start-dev-environment.sh`
3. Check permissions: `chmod +x scripts/*.sh`

### If Docker Issues Persist
1. Restart Docker Desktop
2. Check available disk space
3. Try: `docker system prune -a -f`

### If Nothing Works
1. Backup data: `./scripts/maintenance.sh backup-all`
2. Full reset: `./scripts/maintenance.sh reset`
3. Fresh start: `./start-dev-environment.sh`

---

## 📊 Understanding Status Messages

### Good Signs (✅)
```
✅ Frontend status: true
✅ PenPot app detected: true
✅ Server running: true
✅ All systems are healthy!
```

### Warning Signs (⚠️)
```
⚠️ Frontend watch process not running
⚠️ Demo account may already exist
⚠️ Recovery on cooldown
```

### Error Signs (❌)
```
❌ Frontend not responding
❌ Demo account validation failed
❌ Container not running
❌ Max recovery attempts reached
```

---

## 📞 Getting Help

1. **Check logs**: Desktop app → View → Developer Tools → Console
2. **Run diagnostics**: `./scripts/health-check.sh`
3. **Check documentation**: Read `CLAUDE.md`
4. **Backup first**: `./scripts/maintenance.sh backup-all`

---

**Remember: `./start-dev-environment.sh` solves 90% of problems! 🎯**