# Keyboard Shortcuts - Kizu

## Overview
Kizuku provides a comprehensive keyboard shortcut system combining Figma-standard shortcuts with cross-platform compatibility and extensibility for unique features.

## Platform Differences
- **macOS**: Uses `Cmd` key for primary shortcuts
- **Windows/Linux**: Uses `Ctrl` key for primary shortcuts
- All shortcuts automatically adapt to the platform

## Tool Selection (Figma Standard)
| Shortcut | Tool | Description |
|----------|------|-------------|
| `V` | Move/Select | Selection and move tool |
| `R` | Rectangle | Rectangle/square drawing |
| `O` | Ellipse | Circle/ellipse drawing |
| `T` | Text | Text editing tool |
| `L` | Line | Line drawing tool |
| `P` | Pen | Pen/bezier tool |
| `F` | Frame | Frame/artboard tool |
| `K` | Place Image | Import and place images |
| `Z` | Zoom | Zoom tool |
| `H` | Hand | Pan/hand tool |

## File Operations
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘N` | `Ctrl+N` | New project |
| `⌘O` | `Ctrl+O` | Open project |
| `⌘S` | `Ctrl+S` | Save project |
| `⌘⇧S` | `Ctrl+Shift+S` | Save as... |
| `⌘I` | `Ctrl+I` | Import image |
| `⌘E` | `Ctrl+E` | Export selection |

## Edit Operations
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘Z` | `Ctrl+Z` | Undo |
| `⌘⇧Z` | `Ctrl+Y` | Redo |
| `⌘X` | `Ctrl+X` | Cut |
| `⌘C` | `Ctrl+C` | Copy |
| `⌘V` | `Ctrl+V` | Paste |
| `⌘⇧V` | `Ctrl+Shift+V` | Paste in place |
| `⌘D` | `Ctrl+D` | Duplicate |
| `⌘A` | `Ctrl+A` | Select all |
| `⌘⇧A` | `Ctrl+Shift+A` | Select none |

## View & Navigation
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘0` | `Ctrl+0` | Zoom to fit |
| `⌘1` | `Ctrl+1` | Actual size (100%) |
| `⌘2` | `Ctrl+2` | Zoom to selection |
| `⌘+` | `Ctrl++` | Zoom in |
| `⌘-` | `Ctrl+-` | Zoom out |
| `Tab` | `Tab` | Hide/show UI panels |
| `Space` | `Space` | Pan canvas (hold) |
| `Escape` | `Escape` | Exit current mode |

## Object Operations
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘G` | `Ctrl+G` | Group selection |
| `⌘⇧G` | `Ctrl+Shift+G` | Ungroup selection |
| `⌘L` | `Ctrl+L` | Lock objects |
| `⌘⇧L` | `Ctrl+Shift+L` | Unlock objects |
| `⌘H` | `Ctrl+H` | Hide objects |
| `⌘⇧H` | `Ctrl+Shift+H` | Show objects |

## Layer Order
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘⇧]` | `Ctrl+Shift+]` | Bring to front |
| `⌘]` | `Ctrl+]` | Bring forward |
| `⌘[` | `Ctrl+[` | Send backward |
| `⌘⇧[` | `Ctrl+Shift+[` | Send to back |

## Panel Management
| Shortcut | Action |
|----------|--------|
| `F7` | Toggle layers panel |
| `F8` | Toggle assets panel |
| `F9` | Toggle properties panel |

## View Helpers
| macOS | Windows/Linux | Action |
|-------|---------------|--------|
| `⌘'` | `Ctrl+'` | Show/hide grid |
| `⌘R` | `Ctrl+R` | Show/hide rulers |
| `⌘.` | `Ctrl+.` | Show/hide UI |

## Text Editing Context
| Shortcut | Action |
|----------|--------|
| `Enter` | Start editing selected text |
| `Escape` | Exit text editing mode |

## Modifier-Based Actions
These work in combination with mouse actions:

| Modifier | Action |
|----------|--------|
| `Shift + Drag` | Constrain proportions (squares, circles) |
| `Alt + Drag` | Duplicate while dragging |
| `Cmd/Ctrl + Click` | Multi-select objects |
| `Space + Drag` | Pan canvas |

## Contextual Shortcuts
The system supports different contexts:
- **Global**: Available everywhere
- **Canvas**: When working on the canvas
- **Text Editing**: When editing text

Shortcuts automatically switch context based on current activity.

## Technical Implementation

### Cross-Platform Detection
```javascript
const modifierKey = process.platform === 'darwin' ? 'cmd' : 'ctrl';
```

### Event Integration
All shortcuts trigger both:
1. **Custom Events**: `penpot-shortcut` for loose coupling
2. **Direct Handlers**: Via `registerShortcutHandler()` for tight integration
3. **Menu System**: Compatible with existing menu actions

### Usage Examples

**Register Custom Shortcut:**
```javascript
window.shortcutManager.registerCustomShortcut('cmd+k', 'my-action', 'My custom action');
```

**Register Handler:**
```javascript
window.registerShortcutHandler('select-tool', () => {
  // Switch to selection tool
});
```

**Listen to Shortcut Events:**
```javascript
document.addEventListener('penpot-shortcut', (event) => {
  const { action, context, platform } = event.detail;
  // Handle shortcut
});
```

## Extensibility

### Adding New Shortcuts
The system is designed for easy extension:

1. **Tool Shortcuts**: Add new tool selection shortcuts
2. **Feature Shortcuts**: Add shortcuts for unique PenPot Desktop features
3. **Context Shortcuts**: Add context-specific shortcuts
4. **Platform Shortcuts**: Add platform-specific variations

### Context Management
```javascript
// Switch to different shortcut context
window.shortcutManager.setContext('text-editing');
```

### Custom Contexts
```javascript
// Add new context for specific features
window.shortcutManager.contexts.add('my-feature');
```

## Integration Status

✅ **Implemented:**
- Complete Figma-standard tool shortcuts
- Cross-platform modifier key handling
- Context-aware shortcut system
- Integration with existing menu system
- Custom event dispatch system
- Direct handler registration
- Comprehensive documentation

🔄 **Ready for Integration:**
- All shortcuts emit events PenPot can listen to
- Handler registration system for direct integration
- Context switching for different app modes
- Platform detection for proper key combinations

This keyboard shortcut system provides the familiar Figma experience while being flexible enough to support Kizu's unique features and future extensions.