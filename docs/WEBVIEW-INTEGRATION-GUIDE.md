# Kizu Webview Integration Implementation Guide

## 📋 **What This Document Covers**
**Complete implementation guide for embedding the PenPot web application inside an Electron desktop app using webview technology**

**Why Webview Instead of Direct Loading:**
- Better security isolation between desktop app and web content
- More control over the embedded web application
- Proper separation of desktop features from web features
- Enhanced error handling and recovery options

## 🎯 **End Goal**
Transform Kizu from a simple browser wrapper into a proper desktop application that:
- Loads PenPot web interface in an isolated webview container
- Maintains full PenPot functionality (drawing, saving, collaboration)
- Provides desktop-native features (file dialogs, menus, shortcuts)
- Handles connection issues gracefully with user feedback

## 📊 **Current State vs Target State**

### ❌ **Current Implementation (Simple but Limited)**
```
Electron Main Window → Loads PenPot URL directly → User sees PenPot in window
```
**Problems:**
- No isolation between desktop app and web content
- Limited control over embedded application
- Poor error handling when PenPot server is down
- Security concerns with direct web content access

### ✅ **Target Implementation (Professional Desktop App)**
```
Electron App → HTML Container → Webview → PenPot Web App
     ↕              ↕            ↕           ↕
Desktop Menus → IPC Messages → Events → PenPot Features
```
**Benefits:**
- Secure isolation between desktop and web layers
- Full control over embedded application lifecycle
- Professional error handling and user feedback
- Desktop integration (native dialogs, system notifications)

## 🏗️ **Technical Implementation Details**

### Architecture Overview
1. **Main Process (main.js):** Controls the desktop application window and system integration
2. **Renderer Process (HTML + JS):** Contains the webview and handles user interface
3. **Webview Container:** Isolated environment that runs the PenPot web application
4. **IPC Communication:** Secure message passing between all components

### Key Components to Build

#### 1. Webview Container (`src/renderer/index.html`)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Kizu</title>
    <!-- Desktop app styling and configuration -->
</head>
<body>
    <!-- Loading screen while PenPot starts -->
    <div id="loading-screen">Starting PenPot...</div>
    
    <!-- Webview that contains PenPot web app -->
    <webview id="penpot-webview" 
             src="http://localhost:3449"
             style="width: 100%; height: 100vh;">
    </webview>
    
    <!-- Error screen for connection issues -->
    <div id="error-screen" style="display: none;">
        Connection failed. Retrying...
    </div>
</body>
</html>
```

#### 2. Webview Controller (`src/renderer/webview-controller.js`)
Manages the webview lifecycle and communication:
- Initialize webview with proper security settings
- Handle loading states (loading → success → error)
- Manage communication between desktop app and PenPot
- Retry failed connections automatically

#### 3. IPC Communication Channels (`src/webview/ipc-channels.js`)
Defines secure communication channels:
- `webview:loaded` - PenPot finished loading
- `webview:error` - Connection or loading error occurred  
- `webview:retry` - User requested connection retry
- `file:save` - User wants to save project via desktop dialog
- `file:open` - User wants to open project file

### File Organization
```
Kizu/
├── src/
│   ├── main.js                     # Main Electron process
│   ├── renderer/
│   │   ├── index.html              # Webview container page
│   │   ├── webview-controller.js   # Webview management logic
│   │   └── preload.js              # Security bridge script
│   └── webview/
│       ├── webview-manager.js      # Main process webview utilities
│       └── ipc-channels.js         # Communication definitions
├── docs/
│   └── WEBVIEW-INTEGRATION-GUIDE.md  # This document
└── package.json                    # Dependencies and scripts
```

## 🔧 **Step-by-Step Implementation Process**

### Phase 1: Basic Webview Setup (Day 1-2)
1. **Create renderer HTML container** with webview element
2. **Update main.js** to load renderer page instead of PenPot URL directly
3. **Test basic webview loading** with PenPot development server
4. **Verify all PenPot features work** in webview environment

### Phase 2: IPC Communication (Day 3-4)
1. **Define communication channels** between processes
2. **Implement message routing** for webview events
3. **Add webview lifecycle management** (loading, ready, error states)
4. **Test bidirectional communication** between desktop and web

### Phase 3: Error Handling & Polish (Day 5-6)
1. **Add connection failure detection** and user feedback
2. **Implement automatic retry logic** for server connection issues
3. **Create loading and error screens** for better user experience
4. **Test offline scenarios** and recovery mechanisms

### Phase 4: Production Configuration (Day 7)
1. **Configure production URL handling** for bundled PenPot frontend
2. **Set up proper security policies** for webview content
3. **Add cross-platform compatibility** testing
4. **Final quality assurance** and code review

## 🎯 **Code Quality Requirements**

### Mandatory Standards (Enforced by ESLint)
- **Functions: Maximum 20 lines each**
- **Files: Maximum 300 lines each**  
- **Parameters: Maximum 4 per function**
- **Naming: Descriptive camelCase (minimum 3 characters)**
- **Documentation: JSDoc comments for all functions**

### Example of Compliant Code:
```javascript
/**
 * Initialize webview with security settings and event handlers
 */
function initializeWebview() {
  const webview = document.getElementById('penpot-webview');
  
  setupWebviewSecurity(webview);
  attachWebviewEvents(webview);
  configureWebviewUrl(webview);
}

/**
 * Configure webview security to prevent code injection
 */
function setupWebviewSecurity(webview) {
  webview.nodeIntegration = false;
  webview.contextIsolation = true;
  webview.webSecurity = true;
}
```

## 🚀 **Development Environment Setup**

### Prerequisites
```bash
# 1. Start PenPot development server
cd ../penpot
./manage.sh run-devenv

# 2. Verify PenPot is accessible
curl -I http://localhost:3449
# Should return: HTTP/1.1 200 OK

# 3. Install PenPot Desktop dependencies
cd ../Kizu  
npm install
```

### Development Workflow
```bash
# Start development mode (auto-reload on changes)
npm run dev

# Check code quality (must pass before committing)
npm run lint
npm run code-quality

# Run integration tests
npm run test:integration
```

## 🧪 **Testing Checklist**

### Functionality Tests
- [ ] PenPot loads successfully in webview
- [ ] All drawing tools work correctly
- [ ] Copy/paste operations function properly
- [ ] Zoom and pan controls are responsive
- [ ] Keyboard shortcuts work as expected
- [ ] Projects can be saved and loaded

### Error Handling Tests  
- [ ] App handles PenPot server being down
- [ ] Connection retry works automatically
- [ ] User sees helpful error messages
- [ ] App recovers when server comes back online

### Integration Tests
- [ ] Desktop menus interact correctly with PenPot
- [ ] File dialogs work for save/open operations
- [ ] IPC communication is reliable
- [ ] No memory leaks during extended use

## 🎓 **Knowledge for Future Developers**

### Key Concepts to Understand
1. **Electron Process Model:** 
   - Main process = Node.js environment (system access)
   - Renderer process = Chromium browser (web content)
   - IPC = Secure communication between processes

2. **Webview vs BrowserWindow:**
   - Webview = Embedded browser within a page (better for our use case)
   - BrowserWindow = Separate browser window (what we currently use)

3. **Security Considerations:**
   - Never enable Node.js access in webview (security risk)
   - Always use context isolation (prevents code injection)
   - Validate all IPC messages (prevent malicious commands)

### Common Mistakes to Avoid
1. **Don't bypass security:** Never disable security features for easier development
2. **Don't block UI:** Always handle long operations asynchronously  
3. **Don't ignore errors:** Every error should be caught and handled appropriately
4. **Don't mix responsibilities:** Keep functions focused on single tasks

## 📞 **Support Resources**

### Official Documentation
- [Electron Webview API](https://www.electronjs.org/docs/latest/api/webview-tag)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)

### PenPot Desktop Specific
- Code standards: `CODING_STANDARDS.md`
- ESLint configuration: `eslint.config.js`
- Development setup: `README.md`

### Getting Help
- Check existing code for patterns and examples
- ESLint will catch most code quality issues automatically
- All code must pass pre-commit hooks before being saved

---

**Document Purpose:** Complete implementation guide for webview integration  
**Target Audience:** Current and future development team members  
**Maintenance:** Update this document when implementation changes  
**Last Updated:** 2025-08-13