# Figma Import Testing Checklist

**Branch:** `feature/figma-import-100-percent`
**Phase:** Phase 1 - Foundation (85% target)
**Date:** October 3, 2025

---

## 🚀 Pre-Testing Setup

### 1. Environment Check
- [ ] PenPot backend running (`./start-dev-environment.sh`)
- [ ] Demo license active (auto-login as `demouser`)
- [ ] All dependencies installed (`npm install`)
- [ ] No lint errors (`npm run lint:check`)

### 2. Test Files Needed
- [ ] `.penpot` file (exported from Figma plugin)
- [ ] `.zip` file (PenPot export format)
- [ ] `.fig` file (to test Phase 3 placeholder message)
- [ ] Large file (>50MB for Starter tier limit test)

**Where to get test files:**
- Export from Figma using PenPot Exporter plugin
- Or use sample .penpot files from PenPot community

---

## ✅ Core Functionality Tests

### Test 1: Dashboard Integration
- [ ] App starts successfully
- [ ] Dashboard loads with demo account
- [ ] "Import Figma" card is visible
- [ ] Card shows correct icon (📥) and description

### Test 2: File Picker Opens
- [ ] Click "Import Figma" card
- [ ] File picker dialog opens
- [ ] Filter shows: "Figma Files (.fig, .penpot, .zip)"
- [ ] Can select files
- [ ] Can cancel without errors

### Test 3: Single .penpot File Import
- [ ] Select one .penpot file
- [ ] File picker closes
- [ ] Dashboard shows "Importing files..." status
- [ ] Import completes (check console for errors)
- [ ] Success message shows: "Successfully imported 1 file(s)!"
- [ ] Recent projects refreshes automatically
- [ ] New project appears in recent projects list

### Test 4: Multiple .penpot Files Import
- [ ] Select multiple .penpot files
- [ ] All files process sequentially
- [ ] Success message shows correct count
- [ ] All projects appear in recent projects

### Test 5: .zip File Import
- [ ] Select .zip file (PenPot export)
- [ ] Import completes successfully
- [ ] Project loads correctly

### Test 6: .fig File Handling (Phase 3 Placeholder)
- [ ] Select .fig file
- [ ] Import attempts
- [ ] Error message shows: "Direct .fig import coming in Phase 3..."
- [ ] Error is user-friendly
- [ ] App doesn't crash

---

## 🔒 License & Validation Tests

### Test 7: File Size Validation
**Setup:** Demo account has "private" license (500MB limit)

- [ ] Select file > 500MB
- [ ] Validation fails with clear error
- [ ] Error message shows size and limit
- [ ] Import button disabled

### Test 8: Invalid File Type
- [ ] Select .txt or other non-Figma file
- [ ] File picker filters prevent selection, OR
- [ ] Validation rejects file with error message

### Test 9: Missing/Corrupted File
- [ ] Select file, then delete it before import
- [ ] Error handled gracefully
- [ ] User-friendly error message shown

---

## 🎨 UI/UX Tests

### Test 10: Status Messages
- [ ] Success messages show with green styling
- [ ] Error messages show with red styling
- [ ] Messages auto-dismiss after 5 seconds
- [ ] Messages are readable and helpful

### Test 11: Dashboard Responsiveness
- [ ] Dashboard doesn't freeze during import
- [ ] Status updates appear in real-time
- [ ] Recent projects grid updates after import
- [ ] All interactions remain responsive

### Test 12: Multiple Import Attempts
- [ ] Import file 1
- [ ] Wait for completion
- [ ] Import file 2 immediately
- [ ] Both complete successfully
- [ ] No state conflicts

---

## 🐛 Error Handling Tests

### Test 13: Cancel During Import
- [ ] Start import
- [ ] Close file picker immediately
- [ ] No errors in console
- [ ] App remains stable

### Test 14: Backend Disconnected
**Setup:** Stop PenPot backend
- [ ] Attempt import
- [ ] Error message shows backend issue
- [ ] App doesn't crash
- [ ] Can retry after backend restart

### Test 15: Network Errors (if applicable)
- [ ] Simulate network issues
- [ ] Import fails gracefully
- [ ] Error message is helpful
- [ ] Can retry

---

## 📊 Progress Tracking Tests

### Test 16: Progress Events
- [ ] Import starts
- [ ] Console shows progress events (if logging enabled)
- [ ] Status updates in dashboard
- [ ] Progress percentage changes (if visible)

### Test 17: Status Transitions
- [ ] Status: "Importing files..."
- [ ] Status: Success or error message
- [ ] Transitions are smooth
- [ ] No flickering or UI jumps

---

## 🔄 Integration Tests

### Test 18: Import → Open Workflow
- [ ] Import .penpot file
- [ ] File appears in recent projects
- [ ] Click project card
- [ ] Project opens in workspace
- [ ] Design loads correctly

### Test 19: Import → Dashboard → Import Again
- [ ] Import file 1
- [ ] Return to dashboard
- [ ] Import file 2
- [ ] Both appear in recent projects
- [ ] No duplicate entries

### Test 20: Session Persistence
- [ ] Import files
- [ ] Close app
- [ ] Restart app
- [ ] Imported projects still in recent list
- [ ] Projects open correctly

---

## 🚨 Edge Cases

### Test 21: Empty File
- [ ] Create empty .penpot file
- [ ] Attempt import
- [ ] Error handled gracefully

### Test 22: Special Characters in Filename
- [ ] File named: `Test ©®™ 日本語.penpot`
- [ ] Import completes
- [ ] Name displays correctly
- [ ] Project opens correctly

### Test 23: Very Long Filename
- [ ] File named: `VeryLongFileNameThatExceedsNormalLengthLimitsForFilesystemsAndMightCauseIssues.penpot`
- [ ] Import completes
- [ ] Name displays correctly (truncated if needed)

### Test 24: Rapid Clicks
- [ ] Click "Import Figma" rapidly (10x)
- [ ] Only one file picker opens
- [ ] No duplicate handlers
- [ ] App stable

---

## 🎯 Performance Tests

### Test 25: Large File Import
- [ ] Import 100MB .penpot file
- [ ] Import completes in reasonable time
- [ ] No memory leaks
- [ ] App remains responsive

### Test 26: Many Files Import
- [ ] Import 10 files simultaneously
- [ ] All process successfully
- [ ] Dashboard updates correctly
- [ ] Memory usage acceptable

---

## 📝 Console/Logs Review

### Test 27: No Errors in Console
- [ ] Open DevTools (Cmd/Ctrl+Shift+I)
- [ ] Go through full import workflow
- [ ] No red errors in console
- [ ] Warnings are acceptable/expected
- [ ] Info logs show progress

### Test 28: IPC Communication
- [ ] Import file
- [ ] Check console for IPC calls
- [ ] `figma:import-file` called correctly
- [ ] Progress events received
- [ ] Status updates received

---

## ✅ Pass Criteria

**Must Pass (Blockers):**
- [ ] Basic .penpot import works
- [ ] Dashboard integration works
- [ ] No crashes or freezes
- [ ] Success/error messages display
- [ ] Imported projects appear correctly

**Should Pass (Important):**
- [ ] Multi-file import works
- [ ] File size validation works
- [ ] .fig shows Phase 3 message
- [ ] Error handling is graceful
- [ ] Progress tracking works

**Nice to Have (Can Fix Later):**
- [ ] All edge cases handled
- [ ] Performance optimized
- [ ] UI polish complete
- [ ] Advanced error messages

---

## 🐛 Bug Report Template

If you find issues, note:

```
**Bug:** [Short description]
**Steps to Reproduce:**
1.
2.
3.

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Console Errors:** [Any errors from DevTools]
**Files Used:** [Test file names/sizes]
**Severity:** [Blocker/High/Medium/Low]
```

---

## 📋 Post-Testing Actions

After testing, we'll:
1. Fix critical bugs (blockers)
2. Add missing error handling
3. Polish UI/UX issues
4. Add usage tracking (Task 1.9)
5. Create upgrade prompts (Task 1.10)
6. Move to Phase 2 or iterate on Phase 1

---

## 🎉 Success Metrics

**Phase 1 is successful if:**
- ✅ 90%+ of tests pass
- ✅ Core workflow (import → recent projects) works
- ✅ No critical bugs
- ✅ User experience is smooth
- ✅ Foundation ready for Phase 2

---

**Ready to test!** Start with Tests 1-6 (core functionality), then explore from there. 🚀
