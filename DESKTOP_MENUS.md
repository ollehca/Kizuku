# Desktop Menu System

## Overview
Kizuku provides comprehensive native menus that integrate seamlessly with the PenPot web application. The menu system includes professional design tool functionality with proper keyboard shortcuts and platform-specific behaviors.

## Menu Structure

### File Menu
**Core Operations:**
- `New Project` (⌘/Ctrl+N) - Create new project
- `New File` (⌘/Ctrl+Alt+N) - Create new file in project
- `Open Project` (⌘/Ctrl+O) - Open .penpot files
- `Open Recent` - Recently opened files (with clear option)

**Save Operations:**
- `Save Project` (⌘/Ctrl+S) - Save current project
- `Save As...` (⌘/Ctrl+Shift+S) - Save with new name/location

**Import/Export:**
- `Import Image` (⌘/Ctrl+I) - Import images (PNG, JPG, SVG, etc.)
- `Import Font` - Import custom fonts
- `Export Selection as PNG/SVG` (⌘/Ctrl+E, ⌘/Ctrl+Shift+E)
- `Export Artboard as PNG/SVG` - Export entire artboards
- `Export for Web (HTML/CSS)` - Developer handoff

### Edit Menu
**Undo/Redo:**
- `Undo` (⌘/Ctrl+Z) - Undo last action
- `Redo` (⌘/Ctrl+Shift+Z / Ctrl+Y) - Redo last undone action

**Clipboard:**
- `Cut` (⌘/Ctrl+X) - Cut selection
- `Copy` (⌘/Ctrl+C) - Copy selection  
- `Paste` (⌘/Ctrl+V) - Paste from clipboard
- `Paste in Place` (⌘/Ctrl+Shift+V) - Paste at exact position

**Object Operations:**
- `Duplicate` (⌘/Ctrl+D) - Duplicate selection
- `Delete` (Backspace/Delete) - Delete selection

**Selection:**
- `Select All` (⌘/Ctrl+A) - Select all objects
- `Select None` (⌘/Ctrl+Shift+A) - Clear selection
- `Find` (⌘/Ctrl+F) - Find objects/text

### View Menu
**Zoom Controls:**
- `Zoom In` (⌘/Ctrl+Plus) - Increase zoom level
- `Zoom Out` (⌘/Ctrl+Minus) - Decrease zoom level
- `Zoom to Fit` (⌘/Ctrl+0) - Fit all content in view
- `Zoom to Selection` (⌘/Ctrl+2) - Focus on selected objects
- `Actual Size` (⌘/Ctrl+1) - 100% zoom level

**View Helpers:**
- `Show Grid` (⌘/Ctrl+') - Toggle grid visibility
- `Show Rulers` (⌘/Ctrl+R) - Toggle ruler display
- `Show UI` (⌘/Ctrl+.) - Toggle interface visibility

**Panel Management:**
- `Layers Panel` (F7) - Toggle layers panel
- `Assets Panel` (F8) - Toggle assets panel  
- `Properties Panel` (F9) - Toggle properties panel

### Object Menu
**Grouping:**
- `Group` (⌘/Ctrl+G) - Group selected objects
- `Ungroup` (⌘/Ctrl+Shift+G) - Ungroup selection

**Layer Order:**
- `Bring to Front` (⌘/Ctrl+Shift+]) - Move to top layer
- `Bring Forward` (⌘/Ctrl+]) - Move up one layer
- `Send Backward` (⌘/Ctrl+[) - Move down one layer
- `Send to Back` (⌘/Ctrl+Shift+[) - Move to bottom layer

**Alignment:**
- Align Left/Center/Right - Horizontal alignment
- Align Top/Middle/Bottom - Vertical alignment
- Distribute Horizontally/Vertically - Even spacing

**Object State:**
- `Lock` (⌘/Ctrl+L) - Lock objects from editing
- `Unlock` (⌘/Ctrl+Shift+L) - Unlock locked objects
- `Hide` (⌘/Ctrl+H) - Hide objects from view
- `Show` (⌘/Ctrl+Shift+H) - Show hidden objects

### Window Menu
Standard window management:
- `Minimize` - Minimize window
- `Close` - Close window
- `Zoom` (macOS) - Toggle window zoom

### Help Menu
- `About Kizu` - Version and app information

## Platform-Specific Features

### macOS
- Application menu with standard macOS items
- `Preferences...` (⌘,) - Access app preferences
- Services integration
- Hide/Show application commands

### Windows/Linux
- Standard File/Edit/View menu layout
- Platform-appropriate keyboard shortcuts

## Menu Integration System

### IPC Communication
Menu actions are sent from the main process to the renderer via IPC:

```javascript
// Main process sends action
mainWindow.webContents.send('menu-action', 'new-project');

// Renderer receives via preload script
window.electronAPI.onMenuAction((action, data) => {
  // Handle menu action in PenPot
});
```

### Custom Event System
Desktop menu actions are dispatched as custom events:

```javascript
// Automatic event dispatch
document.addEventListener('penpot-desktop-action', (event) => {
  const { action, data } = event.detail;
  // Integrate with PenPot's action system
});
```

### Handler Registration
PenPot can register handlers for specific menu actions:

```javascript
// Register handler for menu actions
window.registerDesktopMenuHandler('new-project', () => {
  // PenPot-specific new project logic
});
```

## File Type Support

### Import Formats
- **Images**: PNG, JPG, JPEG, GIF, BMP, WebP, SVG
- **Fonts**: TTF, OTF, WOFF, WOFF2
- **Projects**: .penpot, .json

### Export Formats
- **Raster**: PNG (with transparency)
- **Vector**: SVG (scalable)
- **Web**: HTML/CSS code export

## Implementation Status

✅ **Completed Features:**
- Complete menu structure with 60+ menu items
- Cross-platform keyboard shortcuts
- Native file dialogs for open/save operations
- IPC communication system
- Platform-specific menu behaviors
- Checkbox states for view toggles

🔄 **Integration Points Ready:**
- Menu action handlers for PenPot integration
- Custom event system for web app communication
- File system operations via secure IPC
- Export dialogs with format selection

## Usage for Developers

The menu system is fully functional and ready for PenPot integration. Menu actions automatically trigger both:

1. **Custom Events** - For loose coupling with web app
2. **Handler Registration** - For direct function mapping
3. **Console Logging** - For debugging menu interactions

This dual approach ensures compatibility with PenPot's existing architecture while providing a professional desktop experience.