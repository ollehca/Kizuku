# PenPot Modifications Tracking Document

**Purpose**: This document tracks ALL modifications made to the PenPot codebase to ensure compliance with the Mozilla Public License (MPL) 2.0.

**Last Updated**: 2025-09-30

---

## MPL 2.0 Compliance Summary

### License Requirements
- **PenPot Original License**: Mozilla Public License Version 2.0 (MPL 2.0)
- **Location**: `/penpot/LICENSE`
- **Our Compliance Strategy**:
  - All PenPot code modifications remain under MPL 2.0
  - Kizu-specific code (Electron wrapper) is a "Larger Work" under MPL 2.0 Section 3.3
  - Source code availability: Will be maintained on GitHub
  - License notices: Preserved in all modified files

### Key MPL 2.0 Obligations

1. **Source Code Form** (Section 3.1)
   - ✅ Modified PenPot code must remain under MPL 2.0
   - ✅ Recipients must be informed of MPL 2.0 terms
   - ✅ Source code must be made available

2. **Distribution of Executable Form** (Section 3.2)
   - ✅ When distributing binaries, source code must be available
   - ✅ Recipients must be informed how to obtain source code
   - ⚠️ TODO: Add notice in Kizuku about/help menu pointing to source code

3. **Larger Work** (Section 3.3)
   - ✅ Kizuku Electron wrapper is a "Larger Work"
   - ✅ Can distribute under different terms (proprietary license for Kizu-specific code)
   - ✅ Must comply with MPL 2.0 for PenPot portions

4. **Notices** (Section 3.4)
   - ✅ Cannot remove/alter license notices in PenPot source
   - ✅ Must preserve copyright notices
   - ✅ Can add additional copyright notices for our modifications

5. **Patent Grants** (Section 2)
   - ✅ Contributors grant patent licenses for their contributions
   - ✅ No additional patent obligations for Larger Work

---

## Modified PenPot Files

### Frontend Modifications

#### 1. `penpot/frontend/src/app/main/data/auth.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~5 lines added/modified
- **Purpose**: Authentication flow integration with Kizu
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Modified to support persistent authentication for desktop app

#### 2. `penpot/frontend/src/app/main/data/dashboard.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~9 lines added/modified
- **Purpose**: Dashboard data handling for desktop environment
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Enhanced dashboard data management

#### 3. `penpot/frontend/src/app/main/data/fonts.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~8 lines added/modified
- **Purpose**: Font management integration
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Modified font loading and management for desktop

#### 4. `penpot/frontend/src/app/main/ui.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~53 lines removed/simplified
- **Purpose**: UI simplification for desktop app
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Streamlined UI components for desktop experience
- **Backup Available**: `ui.cljs.backup`

#### 5. `penpot/frontend/src/app/main/ui/dashboard/fonts.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~4 lines added/modified
- **Purpose**: Dashboard fonts UI integration
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Font management UI adjustments
- **Backup Available**: `fonts.cljs.backup`

#### 6. `penpot/frontend/src/app/main/ui/dashboard/fonts.scss`
- **Status**: MODIFIED
- **Lines Changed**: ~88 lines reformatted
- **Purpose**: Styling updates for fonts dashboard
- **Compliance**:
  - ✅ Original license notice preserved (if present)
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: SCSS refactoring and styling improvements
- **Backup Available**: `fonts.scss.backup`

#### 7. `penpot/frontend/src/app/main/ui/routes.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~16 lines added/modified
- **Purpose**: Route handling for desktop app
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Modified routing logic for desktop environment

#### 8. `penpot/frontend/src/app/main/ui/static.cljs`
- **Status**: MODIFIED
- **Lines Changed**: ~4 lines added/modified
- **Purpose**: Static UI components updates
- **Compliance**:
  - ✅ Original license notice preserved
  - ✅ Remains under MPL 2.0
  - ⚠️ TODO: Add comment marking Kizuku modifications
- **Description**: Static content adjustments

#### 9. `penpot/yarn.lock`
- **Status**: MODIFIED
- **Lines Changed**: ~37 lines changed
- **Purpose**: Dependency updates
- **Compliance**:
  - ✅ Dependency file, no license implications
  - ✅ Not considered "Covered Software"
- **Description**: Yarn dependency lock file updates

---

## Kizu-Specific Files (NOT subject to MPL 2.0)

These files are part of the "Larger Work" and can be under proprietary license:

### Electron Wrapper (`/src/`)
- `src/main.js` - Main Electron process
- `src/preload.js` - Preload script
- `src/config.js` - Configuration
- `src/window-manager.js` - Window management
- `src/tab-manager.js` - Tab management
- `src/penpot-server.js` - PenPot server integration
- `src/ipc-handlers.js` - IPC communication
- `src/menu-actions.js` - Menu actions
- `src/menu-builder.js` - Menu construction
- `src/shortcuts.js` - Keyboard shortcuts

### Services
- `src/services/auth-storage.js` - Authentication storage

### Utilities
- `src/utils/logger.js` - Logging utilities
- `src/utils/logo-system.js` - Logo management
- `src/utils/recovery-menu.js` - Recovery features
- `src/utils/recovery.js` - Recovery logic
- `src/utils/tab-helpers.js` - Tab utilities
- `src/utils/loading-helpers.js` - Loading utilities

### Frontend Integration
- `src/frontend-integration/auth-integration.js` - Auth integration bridge

### Test Utilities
- `src/test-utils/` - All test helper files

### Project Files (NOT subject to MPL 2.0)
- `package.json` - Kizuku project configuration
- `README.md` - Kizuku documentation
- `CLAUDE.md` - Development guide
- `.eslintrc.js` - ESLint configuration
- All scripts in `/scripts/` directory

---

## Compliance Checklist

### Immediate Actions Required
- [ ] Add modification markers to all 9 modified PenPot files
- [ ] Ensure source code repository is publicly accessible
- [ ] Add "About" menu entry with link to source code
- [ ] Create NOTICE file listing all modifications
- [ ] Add MPL 2.0 compliance statement to README

### Before Distribution
- [ ] Verify all modified files have proper license notices
- [ ] Create source code distribution mechanism (GitHub releases)
- [ ] Document how users can obtain source code
- [ ] Test that modified PenPot code still functions under MPL 2.0
- [ ] Legal review of licensing structure

### Ongoing Compliance
- [ ] Update this document for every PenPot modification
- [ ] Preserve backup files before modifying PenPot code
- [ ] Mark all new modifications with clear comments
- [ ] Regular audits of PenPot directory changes
- [ ] Maintain modification history in git commits

---

## Modification Marking Template

For all modified PenPot files, add this comment block:

```clojure
;; ============================================================================
;; MODIFIED BY KIZUKU (https://github.com/ollehca/PenPotDesktop)
;; Original file from PenPot (https://github.com/penpot/penpot)
;; Licensed under Mozilla Public License Version 2.0
;; Modifications: [Brief description]
;; Date: [YYYY-MM-DD]
;; ============================================================================
```

For SCSS/CSS files:
```scss
/* ============================================================================
 * MODIFIED BY KIZUKU (https://github.com/ollehca/PenPotDesktop)
 * Original file from PenPot (https://github.com/penpot/penpot)
 * Licensed under Mozilla Public License Version 2.0
 * Modifications: [Brief description]
 * Date: [YYYY-MM-DD]
 * ============================================================================
 */
```

---

## Source Code Availability Plan

### Current Repository
- **GitHub**: https://github.com/ollehca/PenPotDesktop
- **Visibility**: Should remain public for MPL 2.0 compliance
- **Branch Strategy**: Maintain clear separation between PenPot modifications and Kizuku code

### Distribution Strategy
1. **GitHub Releases**: Distribute binaries via GitHub Releases
2. **Source Code**: Full source code available in same repository
3. **Notice**: Include notice in binary distribution pointing to source
4. **Documentation**: Clear README explaining licensing structure

### Binary Distribution Notice (to be added)
```
Kizuku Desktop Application
=========================
This application contains:
- PenPot design software (MPL 2.0 licensed)
- Kizuku Desktop wrapper (proprietary)

Source code for PenPot components and modifications is available at:
https://github.com/ollehca/PenPotDesktop

For PenPot license terms, see: https://github.com/penpot/penpot/blob/develop/LICENSE
```

---

## Legal Notes

### What We CAN Do (MPL 2.0 Allows)
✅ Create proprietary Electron wrapper around PenPot
✅ Distribute binaries with proprietary license for Kizuku code
✅ Charge for the combined product (Kizu)
✅ Add proprietary authentication/licensing system
✅ Add proprietary features outside PenPot code
✅ Use different license for Kizu-specific code

### What We MUST Do (MPL 2.0 Requires)
⚠️ Keep PenPot modifications under MPL 2.0
⚠️ Make modified PenPot source code available
⚠️ Preserve PenPot license notices
⚠️ Inform users how to obtain source code
⚠️ Mark modifications to PenPot files

### What We CANNOT Do (MPL 2.0 Prohibits)
❌ Remove PenPot license notices
❌ Claim PenPot code as proprietary
❌ Prevent users from accessing PenPot source
❌ Restrict rights to modified PenPot code
❌ Use PenPot trademarks without permission (we use "Kizuku" instead)

---

## Risk Assessment

### Current Compliance Status
- **Risk Level**: MEDIUM
- **Issues**:
  - Modified files lack modification markers
  - No user-facing notice about source code availability
  - Need explicit NOTICE file

### Recommended Actions (Priority Order)
1. **CRITICAL**: Add modification markers to all 9 files
2. **HIGH**: Create NOTICE file and add to distribution
3. **HIGH**: Add "About" menu with source code link
4. **MEDIUM**: Legal review of licensing approach
5. **MEDIUM**: Document source code access in README

---

## Future Authentication System Compliance

### Planned License System Impact
When implementing Kizuku authentication/licensing:

✅ **COMPLIANT**:
- License validation in Electron wrapper (Kizuku code)
- Local account storage (Kizuku code)
- License code generation system (Kizuku code)
- Business/collaborative features (Kizuku code)

⚠️ **REQUIRES CARE**:
- Any modifications to PenPot's authentication system
- Changes to PenPot's user management
- Integration points between Kizuku licensing and PenPot

**Strategy**: Keep authentication as Electron-layer feature, minimize PenPot code changes

---

## Audit History

### 2025-09-30 - Initial Audit
- **Auditor**: Claude (AI Assistant)
- **Scope**: Full retroactive analysis from fork
- **Files Reviewed**: 9 modified PenPot files
- **Status**: Documentation created, compliance markers needed
- **Next Review**: After adding modification markers

### Future Audits
- Schedule: Before each major release
- Trigger: Any PenPot file modification
- Process: Update this document, verify compliance

---

## Questions for Legal Review

1. Is our interpretation of "Larger Work" correct for Electron wrapper?
2. Do we need separate MPL 2.0 notices in binary distributions?
3. Is GitHub source availability sufficient for MPL 2.0 compliance?
4. Should we include PenPot's full LICENSE file in our distributions?
5. Any additional trademark considerations for "Kizuku" branding?

---

## References

- **MPL 2.0 Full Text**: https://www.mozilla.org/en-US/MPL/2.0/
- **MPL 2.0 FAQ**: https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- **PenPot License**: https://github.com/penpot/penpot/blob/develop/LICENSE
- **PenPot Repository**: https://github.com/penpot/penpot

---

## Contact

For licensing questions or concerns:
- GitHub Issues: https://github.com/ollehca/PenPotDesktop/issues
- Email: [To be added]

---

**IMPORTANT**: This document must be updated BEFORE making any new modifications to PenPot code. NO EXCEPTIONS.