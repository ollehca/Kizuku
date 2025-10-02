# Changelog

All notable changes to Kizu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete embedded backend architecture foundation
- License-aware configuration system (private/business)
- Authentication abstraction layer (local/cloud)
- Storage abstraction layer (local/cloud)
- Project management system with .kizu file format
- Backend service manager coordination layer
- Secure IPC communication bridge
- Promise-based renderer API client
- TypeScript type definitions for all APIs
- Comprehensive test suite (68 tests)
- Native file dialogs (save/open)
- Cross-platform keyboard shortcuts
- Native desktop menus
- Interactive backend API test page
- Complete API documentation

### Changed
- Rebranded from PenPot Desktop to Kizu 築
- Improved ESLint configuration (complexity ≤5, lines ≤20)
- Enhanced code quality with Prettier formatting

### Developer
- Complete architecture documentation
- Backend API usage guide
- .kizu file format specification
- Development environment setup guide
- Week-by-week implementation plans

## [0.1.0] - TBD

Initial foundation release (not yet tagged).

### Added
- Electron wrapper for PenPot
- Basic project structure
- Development tooling setup

---

## Version History Strategy

- **0.x.x** - Pre-production releases (breaking changes allowed in minor versions)
- **1.0.0** - First stable production release
- **After 1.0.0** - Strict SEMVER (breaking changes require major bump)

### Upcoming Milestones

- **0.2.0** - Project Management UI (Issue #70)
- **0.3.0** - Design Workspace Integration
- **0.4.0** - User Onboarding & First Run Experience
- **1.0.0** - Production Ready Release

[Unreleased]: https://github.com/ollehca/Kizu/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ollehca/Kizu/releases/tag/v0.1.0
