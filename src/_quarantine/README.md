# Quarantined Code

This directory contains code that is **not needed for the current (v1.0) implementation** but may be useful in future releases. These files have been quarantined to:

1. **Reduce linting errors** during initial launch
2. **Document architectural decisions** about what functionality is deferred
3. **Preserve code** for potential future use

## Why Quarantine?

The initial Kizuku release (v1.0) is **file-based only** - users import Figma files and get .kizuku files saved locally. There is **no backend integration** in v1.0.

These quarantined files implement backend integration features that we decided to defer to post-launch.

---

## Quarantined Files

### `penpot-backend-uploader.js`

**Original Location**: `src/services/figma/penpot-backend-uploader.js`

**Purpose**: Auto-inject imported .kizuku files into the Penpot frontend workspace through backend API integration

**Why Quarantined**:

- ❌ Requires Penpot backend database integration (not in v1.0)
- ❌ Complex backend API calls that add unnecessary complexity
- ❌ High cyclomatic complexity (27) - difficult to maintain
- ✅ v1.0 uses simple file-based workflow instead
- ✅ Users can manually open .kizuku files through File → Open

**Decision Date**: 2025-01-20

**Future Consideration**:

- May be revisited post-launch if backend integration becomes a priority
- Would require significant refactoring to meet code quality standards
- Alternative approaches (like direct file loading) may be more maintainable

**Used By** (commented out):

- `src/ipc-handlers.js:13` - Import commented out
- `src/ipc-handlers.js:433` - Usage commented out in `handleFileOpen`

---

## How to Use Quarantined Code

If you need to restore quarantined code:

1. **Move the file back** to its original location (see file header comments)
2. **Uncomment usage** in the files listed above
3. **Fix linting issues** before committing
4. **Update this README** to remove the entry
5. **Test thoroughly** - quarantined code may be outdated

---

## Linting Policy

Quarantined files are:

- ✅ **Excluded from ESLint** (see `.eslintignore`)
- ✅ **Excluded from pre-commit hooks**
- ✅ **Documented in LINTING_QUARANTINE.md**
- ❌ **Not maintained** for current code standards

---

**Last Updated**: 2025-01-20
