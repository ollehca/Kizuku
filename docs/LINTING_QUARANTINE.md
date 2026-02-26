# Linting Quarantine Policy

**Last Updated**: 2025-01-20
**Status**: Active for v1.0 Launch

---

## Overview

This document tracks code files and linting issues that have been **intentionally deferred** to post-launch. These are not bugs or technical debt - they are **conscious architectural decisions** to prioritize launch readiness over perfect code quality.

## Philosophy

> **"Ship first, perfect later"**

For v1.0 launch, we prioritize:
1. ✅ **Core functionality** working correctly
2. ✅ **User-facing features** bug-free
3. ✅ **Critical paths** well-tested
4. ⏳ **Code quality improvements** deferred to post-launch

## Quarantine Categories

### 🔒 Category A: Quarantined Files (Not Used in v1.0)

**Policy**: Files excluded from build and linting entirely

| File | Reason | Decision Date |
|------|--------|---------------|
| `src/_quarantine/penpot-backend-uploader.js` | Backend integration not in v1.0 scope | 2025-01-20 |

**Details**: See `src/_quarantine/README.md`

---

### ⚠️ Category B: Deferred Complexity Issues (Used in v1.0)

**Policy**: Active code with linting warnings - will fix post-launch

These files are **essential** for v1.0 but have high cyclomatic complexity. They work correctly but need refactoring for maintainability.

#### Figma Import Pipeline Files

| File | Errors | Types | Notes |
|------|--------|-------|-------|
| **fig-file-parser.js** | 10 | Complexity (11-32), file size (615 lines), function length | Core Figma binary parser - works correctly but complex |
| **figma-json-converter.js** | 7 | Complexity (11-15), file size (621 lines), function length | JSON transformation pipeline - functional but dense |

**Why Deferred**:
- ✅ These files are **battle-tested** during development
- ✅ Figma import functionality **works correctly**
- ✅ Refactoring would be **time-consuming** and **risky** pre-launch
- ✅ Users won't notice code quality issues here
- ⏳ Post-launch: Break into smaller modules, extract helper functions

#### Other Integration Files

| File | Errors | Types | Notes |
|------|--------|-------|-------|
| **auth-orchestrator.js** | 1 | Complexity 12 | Account creation flow - works correctly |
| **auth-integration.js** | 1 | Complexity 11 | Frontend auth integration - tested |
| **ipc-handlers.js** | 1 | Function too long (62 lines) | File import handler - simplified after quarantine |
| **drag-drop-handler.js** | 1 | Template string function (91 lines) | Mostly string literal - acceptable |

**Why Deferred**:
- ✅ Authentication flows are **tested and working**
- ✅ Complexity is **manageable** (11-12, not 30+)
- ✅ User experience is **not impacted**
- ⏳ Post-launch: Extract validation helpers, split conditionals

---

## Linting Configuration

### ESLint Exclusions

```javascript
// .eslintignore
src/_quarantine/**
```

### Accepted Warnings (Not Blocking)

The following files will show linting warnings but **do not block commits**:
- `src/services/figma/fig-file-parser.js`
- `src/services/figma/figma-json-converter.js`
- `src/services/auth-orchestrator.js`
- `src/frontend-integration/auth-integration.js`
- `src/ipc-handlers.js`
- `src/utils/drag-drop-handler.js`

---

## Post-Launch Refactoring Plan

### Phase 1: Quick Wins (Week 1-2 Post-Launch)

- [ ] Extract validation helpers from `auth-orchestrator.js`
- [ ] Split `handleFileOpen` in `ipc-handlers.js` into smaller functions
- [ ] Document complexity hotspots in Figma parsers

### Phase 2: Figma Parser Refactoring (Month 1-2 Post-Launch)

- [ ] Split `fig-file-parser.js` into multiple modules:
  - `fig-parser-core.js` - Main parser logic
  - `fig-parser-nodes.js` - Node transformation
  - `fig-parser-properties.js` - Property conversion
  - `fig-parser-validation.js` - Validation utilities

- [ ] Split `figma-json-converter.js` into multiple modules:
  - `converter-core.js` - Main conversion logic
  - `converter-transforms.js` - Node transformers
  - `converter-styles.js` - Style conversion
  - `converter-utilities.js` - Helper functions

### Phase 3: Comprehensive Cleanup (Month 3+ Post-Launch)

- [ ] Achieve 100% ESLint compliance
- [ ] Add comprehensive unit tests for refactored modules
- [ ] Update documentation for new module structure

---

## Monitoring Strategy

### Pre-Launch Checklist

- [x] All **Category A** files moved to quarantine
- [x] All **user-facing** code is lint-clean
- [x] **Critical paths** (auth, import, file save) tested
- [x] ESLint warnings documented in this file
- [ ] Team aware of post-launch refactoring plan

### Post-Launch Monitoring

- **Week 1**: Monitor error rates in Figma import
- **Week 2**: Collect user feedback on import quality
- **Month 1**: Begin Phase 1 refactoring if no critical bugs

---

## Decision Rationale

### Why Not Fix Before Launch?

1. **Time Constraint**: Launch date is fixed
2. **Risk Management**: Refactoring complex parsers introduces regression risk
3. **User Priority**: Users care about **features working**, not code elegance
4. **Testing Coverage**: Current code is well-tested through usage
5. **Future Flexibility**: Can refactor with real user feedback

### Why This Approach Works

- ✅ **Pragmatic**: Focuses on user value over internal quality
- ✅ **Documented**: Future developers know what needs work
- ✅ **Measured**: We know exactly where the issues are
- ✅ **Planned**: Post-launch refactoring has clear roadmap
- ✅ **Safe**: Critical paths remain clean and tested

---

## Questions & Escalation

**For developers**:
- "Should I fix this linting error?" → Check if file is in Category A (skip) or Category B (note and continue)
- "Can I add to quarantine?" → No - quarantine is only for unused v1.0 code
- "This is blocking my work" → Escalate to tech lead

**For tech lead**:
- "Should we delay launch to fix these?" → Review user impact vs. code quality trade-off
- "New complexity issues appeared" → Assess if they block launch or can be added to Category B

---

**Approved by**: [Tech Lead]
**Next Review**: 2 weeks post-launch
**Success Criteria**: Zero critical bugs in quarantined/deferred code areas
