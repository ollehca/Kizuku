# Kizu 築 Development Guide

This document contains essential information for developing and maintaining the Kizu application.

## Overview

Kizu is an Electron wrapper for the PenPot design platform. It provides a native desktop experience while connecting to either local development servers or production instances.

## Quick Start

### Automated Setup (Recommended)
```bash
# One-command setup that handles everything
./start-dev-environment.sh
```

This script will:
- Start all PenPot containers
- Wait for services to initialize
- Build frontend assets
- Create demo account
- Validate everything is working
- Launch the Kizu app

### Manual Setup
If you need to set up components individually:

```bash
# 1. Start PenPot development environment
cd ../penpot && ./manage.sh start-devenv

# 2. Wait for containers (30 seconds)
sleep 30

# 3. Check health
./scripts/health-check.sh

# 4. Setup demo account
./scripts/manage-demo-accounts.sh setup

# 5. Start Kizu app
npm start
```

## Required Startup Sequence

⚠️ **Critical**: Follow this exact sequence to avoid issues:

1. **Start PenPot containers**: `cd ../penpot && ./manage.sh start-devenv`
2. **Wait for full initialization**: Containers need 30+ seconds to fully start
3. **Verify frontend build**: Check `/home/penpot/penpot/frontend/resources/public/js/config.js` exists
4. **Ensure assets compilation**: If missing files, run frontend watch process
5. **Validate demo account**: Ensure persistent demo credentials work
6. **Start Kizu app**: `npm start`

## Demo Credentials Management

### Current Working Demo Account (CONFIRMED WORKING)
- **Email**: `local@demo.dev`
- **Password**: `test123`
- **Full Name**: Local Demo User

### Manual Login Process (WORKING AS OF LATEST UPDATE)
1. **Start Kizu app**: `npm start`
2. **Automatic redirect**: App will redirect to login page
3. **Manual login**: Enter credentials `local@demo.dev` / `test123`
4. **Access dashboard**: Successfully reach working dashboard

### Demo Account Commands
```bash
# Complete setup (create + validate + cleanup old accounts)
./scripts/manage-demo-accounts.sh setup

# Individual operations
./scripts/manage-demo-accounts.sh create     # Create demo account
./scripts/manage-demo-accounts.sh validate  # Test login
./scripts/manage-demo-accounts.sh reset     # Reset password
./scripts/manage-demo-accounts.sh list      # List all demo accounts
./scripts/manage-demo-accounts.sh cleanup   # Remove old temp accounts
```

### Why Demo Accounts Break
- Temporary demo accounts (pattern: `demo-[timestamp].demo@example.com`) are automatically cleaned up
- Database resets during development can remove accounts
- Container restarts without persistent volumes lose data

## Health Monitoring

### Health Check Commands
```bash
# Full comprehensive check
./scripts/health-check.sh

# Quick status check
./scripts/health-check.sh --quick

# Auto-repair common issues
./scripts/health-check.sh --repair
```

### Manual Health Verification
```bash
# Check if all services respond
curl -f http://localhost:3449                    # Frontend
curl -f http://localhost:6060/api               # Backend API
curl -f http://localhost:3449/js/config.js      # Config asset
curl -f http://localhost:3449/css/debug.css     # Debug CSS

# Validate demo login
curl -X POST http://localhost:6060/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@penpot.local","password":"demo123"}'
```

## Troubleshooting

### Common Issues and Solutions

#### 1. 404 Errors for JavaScript/CSS Files
**Symptoms**: Desktop app shows 404 errors for `config.js`, `debug.css`
**Cause**: Frontend build process incomplete or files missing
**Solution**:
```bash
# Auto-repair
./scripts/health-check.sh --repair

# Manual fix
docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
```

#### 2. Demo Login Fails
**Symptoms**: Demo credentials don't work, login returns 401/403
**Cause**: Demo account expired, deleted, or database reset
**Solution**:
```bash
./scripts/manage-demo-accounts.sh setup
```

#### 3. Containers Not Starting
**Symptoms**: `./manage.sh start-devenv` fails or containers exit
**Cause**: Docker resource issues, port conflicts, or previous containers
**Solution**:
```bash
# Clean restart
cd ../penpot
./manage.sh drop-devenv
./manage.sh start-devenv
```

#### 4. Frontend Assets Missing
**Symptoms**: CSS/JS files return 404, page doesn't load properly
**Cause**: Build process not running or incomplete compilation
**Solution**:
```bash
# Check if watch process is running
docker exec penpot-devenv-main pgrep -f "yarn.*watch"

# Restart if needed
docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
```

#### 5. Desktop App Shows Blank/Error Page
**Symptoms**: Electron window opens but shows errors or blank page
**Cause**: Backend not ready, frontend not built, or network issues
**Solution**:
```bash
# Run comprehensive health check with auto-repair
./scripts/health-check.sh --repair

# If still failing, restart everything
./start-dev-environment.sh
```

## Development Workflow

### Daily Development Routine
1. **Check environment**: `./scripts/health-check.sh --quick`
2. **Start if needed**: `./start-dev-environment.sh`
3. **Validate demo access**: Try logging in with `demo@penpot.local / demo123`
4. **Monitor logs**: Keep an eye on console for any new errors

### Before Making Changes
1. **Backup current state**: Note current working configuration
2. **Test demo credentials**: Ensure they work before changes
3. **Document changes**: Update this file with any new requirements

### After Development Session
1. **Leave containers running**: No need to stop unless troubleshooting
2. **Check for new issues**: Run `./scripts/health-check.sh`
3. **Update documentation**: Add any new troubleshooting steps discovered

## Service Endpoints

### Development URLs
- **Frontend**: http://localhost:3449
- **Backend API**: http://localhost:6060/api
- **Admin Interface**: http://localhost:6060/admin (if enabled)
- **Mail Catcher**: http://localhost:1080
- **MinIO Storage**: http://localhost:9001

### Container Access
```bash
# Main development container
docker exec -it penpot-devenv-main bash

# Database
docker exec -it penpotdev-postgres-1 psql -U penpot -d penpot

# Check logs
docker logs penpot-devenv-main -f
```

## File Structure

### Key Files
- `start-dev-environment.sh` - Automated startup script
- `scripts/health-check.sh` - Health monitoring and auto-repair
- `scripts/manage-demo-accounts.sh` - Demo account management
- `src/main.js` - Electron main process (includes auto-recovery)
- `package.json` - Dependencies and npm scripts

### Important Directories
- `../penpot/` - Main PenPot repository
- `src/` - Desktop app source code
- `scripts/` - Development and maintenance scripts

## Build Commands

### PenPot Commands (run from ../penpot/)
```bash
./manage.sh start-devenv     # Start development environment
./manage.sh stop-devenv      # Stop development environment  
./manage.sh drop-devenv      # Remove containers and volumes
./manage.sh log-devenv       # View container logs
```

### Kizu App Commands
```bash
npm start                    # Start Kizu app in development
npm run build               # Build Kizu app for production
npm test                    # Run tests (if available)
```

### Frontend Commands (inside container)
```bash
docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"    # Start build process
docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn build"    # One-time build
```

## Automated Recovery Features

The Kizu app includes automated recovery mechanisms:
- **Missing asset detection**: Automatically creates placeholder files
- **Service health monitoring**: Checks backend connectivity
- **Auto-restart mechanisms**: Attempts to recover from common failures

These are implemented in `src/main.js` and can be enhanced as needed.

## Data Persistence

### Current Setup
- **Database**: Persisted in Docker volumes
- **File storage**: Persisted in Docker volumes  
- **Demo accounts**: Persistent (but can be recreated)

### Backup Recommendations
- Demo account credentials are reliable: `demo@penpot.local / demo123`
- For important development work, consider setting up persistent demo data
- Regular health checks prevent most data loss scenarios

## Security Notes

- Demo credentials are intentionally simple for development
- Local development environment should not be exposed externally
- All services run on localhost only
- Admin interfaces should be access-controlled in production

## Support and Resources

### Getting Help
1. **Check this documentation first**
2. **Run health checks**: `./scripts/health-check.sh`
3. **Check PenPot logs**: `docker logs penpot-devenv-main`
4. **Restart environment**: `./start-dev-environment.sh`

### Useful Debugging Commands
```bash
# Container status
docker ps

# Service health
curl -I http://localhost:3449
curl -I http://localhost:6060/api

# Frontend assets
ls -la ../penpot/frontend/resources/public/js/
ls -la ../penpot/frontend/resources/public/css/

# Database connection
docker exec penpotdev-postgres-1 pg_isready -U penpot
```

---

*Last updated: [Current Date] - This document should be updated whenever new procedures or troubleshooting steps are discovered.*