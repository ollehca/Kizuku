# Versioning Strategy

Kizuku follows [Semantic Versioning 2.0.0](https://semver.org/).

## Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## Pre-1.0 Development (Current Phase)

During `0.x.x` development:
- API is unstable and subject to change
- **MINOR** versions may include breaking changes
- **PATCH** versions for bug fixes only
- No strict backwards compatibility guarantees

### Example
- `0.1.0` → `0.2.0`: May include breaking changes (acceptable)
- `0.2.0` → `0.2.1`: Bug fixes only (no breaking changes)

## Post-1.0 Development

After reaching `1.0.0`:
- Strict SEMVER compliance
- Breaking changes **require** MAJOR version bump
- New features increment MINOR version
- Bug fixes increment PATCH version

### Examples
- `1.0.0` → `2.0.0`: Breaking API changes
- `1.0.0` → `1.1.0`: New features, backwards compatible
- `1.0.0` → `1.0.1`: Bug fixes only

## Branching Strategy

### Branches
```
main          - Stable releases only (tagged versions)
develop       - Integration branch for features
feature/*     - Individual feature development
hotfix/*      - Critical bug fixes for main
```

### Workflow
1. **Feature Development**
   ```bash
   git checkout develop
   git checkout -b feature/issue-XX-description
   # ... develop and test
   git push origin feature/issue-XX-description
   # Create PR to develop
   ```

2. **Release to Main**
   ```bash
   # When ready for release milestone
   git checkout main
   git merge develop
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin main --tags
   ```

3. **Hotfix**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug
   # ... fix and test
   git checkout main
   git merge hotfix/critical-bug
   git tag -a vX.Y.Z -m "Hotfix vX.Y.Z"
   git push origin main --tags
   # Also merge back to develop
   git checkout develop
   git merge hotfix/critical-bug
   ```

## Release Milestones

### Current Version: 0.1.0 (in develop)
Foundation phase - backend architecture complete

### Planned Versions

#### 0.2.0 - Project Management UI
**Target**: Complete Issue #70
- [ ] Project creation UI
- [ ] Project loading/saving UI
- [ ] Recent projects view
- [ ] Project settings UI
- [ ] File dialogs integration

#### 0.3.0 - Design Workspace
**Target**: Core design functionality
- [ ] Canvas integration
- [ ] Basic design tools
- [ ] Asset management UI
- [ ] Export capabilities

#### 0.4.0 - User Experience
**Target**: Polished experience
- [ ] Onboarding flow
- [ ] First-run experience
- [ ] Settings management UI
- [ ] Help documentation

#### 1.0.0 - Production Release
**Target**: Stable, feature-complete release
- [ ] All core features complete
- [ ] Comprehensive testing
- [ ] User documentation
- [ ] Performance optimization
- [ ] Security audit
- [ ] Stable API

## Tagging Conventions

### Tag Format
```
vMAJOR.MINOR.PATCH
```

### Examples
- `v0.1.0` - Initial foundation
- `v0.2.0` - Project management
- `v1.0.0` - Production release
- `v1.0.1` - Bug fix
- `v2.0.0` - Breaking changes

### Creating Tags
```bash
# Annotated tag (recommended)
git tag -a v0.2.0 -m "Release v0.2.0: Project Management UI"

# Push tags to remote
git push origin v0.2.0

# Or push all tags
git push --tags
```

## Changelog Maintenance

All changes must be documented in `CHANGELOG.md`:

1. **During Development**: Add to `[Unreleased]` section
2. **On Release**: Move to version section with date
3. **Categories**: Added, Changed, Deprecated, Removed, Fixed, Security

## Version Bumping Checklist

Before releasing a new version:

- [ ] Update `CHANGELOG.md` with version and date
- [ ] Update `package.json` version
- [ ] Run full test suite (`npm test`)
- [ ] Run linting (`npm run lint:check`)
- [ ] Update documentation if needed
- [ ] Create git tag
- [ ] Push to remote
- [ ] Create GitHub release with notes

## NPM Version Command

Use npm's built-in version bumping:

```bash
# Patch release (0.1.0 → 0.1.1)
npm version patch

# Minor release (0.1.0 → 0.2.0)
npm version minor

# Major release (0.1.0 → 1.0.0)
npm version major

# Pre-release (0.1.0 → 0.1.1-beta.0)
npm version prerelease --preid=beta
```

This automatically:
- Updates `package.json`
- Creates git commit
- Creates git tag

## Current Status

- **Branch**: `develop`
- **Version**: `0.1.0` (unreleased)
- **Next Milestone**: `0.2.0` (Project Management UI)
- **Target for Main**: When reaching stable milestone (TBD)

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
