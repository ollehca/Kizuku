# 📜 PenPot Desktop - Scripts Guide

## 🎯 Main Scripts

### 🚀 `start-dev-environment.sh`
**Main startup script - Use this first!**
```bash
./start-dev-environment.sh
```
**What it does:**
- Starts all PenPot containers
- Waits for services to be ready
- Creates demo account
- Validates everything works
- Launches desktop app

---

### 🏥 `scripts/health-check.sh`
**Health monitoring and auto-repair**

```bash
# Check everything
./scripts/health-check.sh

# Quick check only
./scripts/health-check.sh --quick

# Check and auto-repair
./scripts/health-check.sh --repair
```

**What it checks:**
- Container status
- Service endpoints
- Frontend assets
- Demo account
- Database connectivity
- System resources

---

### 👤 `scripts/create-demo-simple.sh`
**Simple demo account creation**
```bash
./scripts/create-demo-simple.sh
```
**Creates:**
- Email: `demo@penpot.local`
- Password: `demo123`
- Full Name: Demo User

---

### 👥 `scripts/manage-demo-accounts.sh`
**Advanced demo account management**
```bash
# Complete setup
./scripts/manage-demo-accounts.sh setup

# Individual commands
./scripts/manage-demo-accounts.sh create
./scripts/manage-demo-accounts.sh validate
./scripts/manage-demo-accounts.sh reset
./scripts/manage-demo-accounts.sh list
./scripts/manage-demo-accounts.sh cleanup
```

---

### 💾 `scripts/maintenance.sh`
**Backup, restore, and maintenance**

```bash
# Backup everything
./scripts/maintenance.sh backup-all

# Individual backups
./scripts/maintenance.sh backup-db
./scripts/maintenance.sh backup-volumes

# Restore (BE CAREFUL!)
./scripts/maintenance.sh restore-db FILE
./scripts/maintenance.sh restore-volumes TIMESTAMP

# Maintenance
./scripts/maintenance.sh cleanup
./scripts/maintenance.sh info
./scripts/maintenance.sh list

# Nuclear option (DESTROYS EVERYTHING!)
./scripts/maintenance.sh reset
```

---

## 🔄 Common Workflows

### Daily Development
```bash
# Start working
./start-dev-environment.sh

# Check health (optional)
./scripts/health-check.sh --quick
```

### When Things Break
```bash
# Try auto-repair first
./scripts/health-check.sh --repair

# If still broken, check what's wrong
./scripts/health-check.sh

# Emergency restart
./scripts/maintenance.sh reset
./start-dev-environment.sh
```

### Before Making Changes
```bash
# Backup current state
./scripts/maintenance.sh backup-all

# Check system health
./scripts/health-check.sh
```

### Fixing Demo Account
```bash
# Simple recreation
./scripts/create-demo-simple.sh

# Advanced management
./scripts/manage-demo-accounts.sh setup
```

---

## 📊 Script Options Quick Reference

### Health Check Options
- `--quick` - Fast check only
- `--repair` - Check and auto-fix issues

### Demo Account Options
- `create` - Create new account
- `validate` - Test login
- `reset` - Reset password
- `list` - Show all accounts
- `cleanup` - Remove old accounts
- `setup` - Complete setup

### Maintenance Options
- `backup-all` - Backup everything
- `backup-db` - Database only
- `backup-volumes` - Volumes only
- `restore-db FILE` - Restore database
- `restore-volumes TIME` - Restore volumes
- `cleanup` - Clean Docker resources
- `info` - Show volume sizes
- `list` - List backups
- `reset` - **DESTROY EVERYTHING**

---

## 🎨 Script Output Colors

- 🟢 **Green (✅)** - Success, everything good
- 🟡 **Yellow (⚠️)** - Warning, may need attention
- 🔴 **Red (❌)** - Error, needs fixing
- 🔵 **Blue (ℹ️)** - Information, status updates
- 🟣 **Purple** - Headers, sections

---

## 🔒 Safety Features

### Recovery Limits
- Max 3 recovery attempts
- 30-second cooldown between attempts
- Manual override available

### Backup Protection
- Keeps last 10 database backups
- Keeps last 20 volume backups
- Automatic compression
- Date/time stamping

### Confirmation Prompts
- Reset operations ask for confirmation
- Destructive operations show warnings
- Important data changes require approval

---

## 🆘 If Scripts Don't Work

### Permission Issues
```bash
chmod +x scripts/*.sh
chmod +x start-dev-environment.sh
```

### Path Issues
```bash
# Must be in Kizuku directory
cd /path/to/Kizuku
ls start-dev-environment.sh  # Should exist
```

### Docker Issues
```bash
docker ps  # Check Docker is running
```

---

## 📚 More Information

- **Complete guide**: `CLAUDE.md`
- **Quick start**: `scripts/QUICK-START.md`
- **Troubleshooting**: `scripts/TROUBLESHOOTING.md`
- **Main readme**: `README.md`

---

**Pro tip: When in doubt, run `./start-dev-environment.sh` first! 🎯**