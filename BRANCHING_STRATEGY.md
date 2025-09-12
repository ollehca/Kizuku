# Git Branching Strategy - Kizu

## Branch Structure

### Main Branches
- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for features, pre-release testing

### Supporting Branches
- **`feature/*`** - New features and enhancements
- **`hotfix/*`** - Critical production fixes
- **`release/*`** - Release preparation and final testing

## Workflow

### Feature Development
1. Create feature branch from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/issue-number-brief-description
   ```

2. Work on feature, commit regularly
3. Push feature branch and create PR to `develop`
4. After review, merge to `develop`

### Release Process
1. Create release branch from `develop`
   ```bash
   git checkout develop
   git checkout -b release/v1.0.0
   ```

2. Final testing, bug fixes, version bumps
3. Merge to `main` and tag release
4. Merge back to `develop`

### Hotfixes
1. Create hotfix branch from `main`
2. Fix critical issue
3. Merge to both `main` and `develop`

## Branch Naming Conventions
- `feature/1-create-electron-wrapper`
- `feature/4-add-desktop-menus`  
- `hotfix/critical-crash-fix`
- `release/v1.0.0`

## Protection Rules
- `main`: Require PR reviews, no direct pushes
- `develop`: Require PR reviews, run CI/CD checks

## Current Setup Commands
```bash
# Create and switch to develop branch
git checkout -b develop
git push -u origin develop

# Set up branch protection (via GitHub settings)
# - Require PR reviews for main/develop
# - Require status checks to pass
# - Restrict direct pushes to main
```