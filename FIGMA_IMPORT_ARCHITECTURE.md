# Figma Import Architecture

## Executive Summary

Kizu will achieve **100% Figma compatibility** through a **three-pronged import strategy** that leverages existing open-source tools, enhances conversion accuracy, and provides seamless desktop integration.

**Target Launch:** Initial release with 85-90% compatibility, reaching 98% within 6 months, and pushing to 100% within 12 months post-launch.

**Commitment:** 98% is the MINIMUM acceptable threshold. We aim for complete feature parity.

---

## Current State Analysis

### PenPot Exporter Plugin (Official)
- **GitHub:** https://github.com/penpot/penpot-exporter-figma-plugin
- **Status:** Active development, open-source (MPL-2.0)
- **Current Coverage:** ~85% of Figma core features
- **Export Format:** .zip file containing Penpot-compatible format

### Supported Features (✅ Already Working)
- Basic shapes (rectangles, ellipses, stars, polygons)
- Vectors, lines, arrows
- Frames and sections
- Groups and boolean groups
- Masks
- Text elements (with custom font support)
- All basic shape properties (fills, strokes, shadows, rotations, effects)
- Components, component sets, component instances
- Auto layouts
- Color and typography libraries

### Known Limitations (🔴 Gaps to 100% Target)
1. **Prototyping:** Interactions, flows, conditionals not supported
2. **Advanced Variables:** Variable modes, expressions, conditionals
3. **Performance:** Large file exports are slow (Figma API limitation)
4. **Advanced Blend Modes:** Some modes approximate closest equivalent
5. **Component Properties:** Advanced variant logic partially supported
6. **Dev Mode Features:** Code generation, inspect mode
7. **Plugins:** No plugin ecosystem yet (announced for future)

---

## Architecture Overview

### Three Import Paths

```
┌─────────────────────────────────────────────────────────────┐
│                    KIZU IMPORT SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Path 1: DIRECT PLUGIN INTEGRATION (Primary)                │
│  ┌────────────┐     ┌──────────────┐     ┌──────────┐     │
│  │ Figma File │────▶│ Built-in     │────▶│ PenPot   │     │
│  │   (.fig)   │     │ Exporter     │     │ Import   │     │
│  └────────────┘     └──────────────┘     └──────────┘     │
│       ▲                    │                                 │
│       │                    ▼                                 │
│       │          ┌─────────────────┐                        │
│       │          │ Kizu Enhancer   │                        │
│       │          │ • Fix blend     │                        │
│       │          │ • Validate      │                        │
│       │          │ • Add metadata  │                        │
│       │          └─────────────────┘                        │
│                                                              │
│  Path 2: FIGMA API CONVERSION (Online)                      │
│  ┌────────────┐     ┌──────────────┐     ┌──────────┐     │
│  │ Figma URL  │────▶│ API Fetcher  │────▶│ JSON→Zip │     │
│  │ + Token    │     │ (REST API)   │     │ Converter│     │
│  └────────────┘     └──────────────┘     └──────────┘     │
│                                                              │
│  Path 3: LOCAL .FIG PARSER (Advanced)                       │
│  ┌────────────┐     ┌──────────────┐     ┌──────────┐     │
│  │ Local .fig │────▶│ Kiwi Parser  │────▶│ Direct   │     │
│  │ File       │     │ (Evan's lib) │     │ Import   │     │
│  └────────────┘     └──────────────┘     └──────────┘     │
│                            ⚠️                                │
│                     Unstable format                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Foundation (Launch) - 85% Coverage
**Timeline:** Weeks 1-4

#### 1.1 Integrate PenPot Exporter Plugin
- Embed the official PenPot exporter plugin code in Kizu
- Create Electron-native wrapper that runs plugin logic locally
- Avoid requiring users to install Figma plugin separately

**Technical Approach:**
```javascript
// src/services/figma-importer.js
class FigmaImporter {
  async importFromFile(filePath) {
    // Use Figma Plugin API wrapper
    const pluginLogic = await this.loadPluginLogic();
    const zipFile = await pluginLogic.exportToZip(filePath);
    return this.importZipToPenPot(zipFile);
  }
}
```

#### 1.2 Desktop Integration
- **Native File Picker:** Support drag-and-drop .fig files
- **Batch Import:** Import multiple Figma files at once
- **Progress Tracking:** Real-time import progress with node counts
- **Error Recovery:** Handle partial imports gracefully

#### 1.3 License-Based Limits
```javascript
const IMPORT_LIMITS = {
  starter: {
    pagesPerImport: 10,
    importsPerMonth: 50,
    maxFileSize: '50MB'
  },
  professional: {
    pagesPerImport: 100,
    importsPerMonth: 500,
    maxFileSize: '500MB'
  },
  master: {
    pagesPerImport: Infinity,
    importsPerMonth: Infinity,
    maxFileSize: '5GB',
    batchImport: true,
    automationAPI: true
  }
};
```

---

### Phase 2: Enhanced Accuracy (Post-Launch) - 92% Coverage
**Timeline:** Months 2-3

#### 2.1 Figma API Integration
For online files users want to import directly from Figma cloud:

**Features:**
- Authenticate with Figma personal access token
- Fetch files via REST API (`GET /v1/files/:file_key`)
- Convert JSON structure to PenPot format
- Handle components, styles, variables

**API Endpoints:**
```typescript
// src/services/figma-api-client.ts
class FigmaAPIClient {
  async getFile(fileKey: string, token: string): Promise<FigmaFile> {
    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}`,
      { headers: { 'X-Figma-Token': token } }
    );
    return response.json();
  }

  async convertToKizu(figmaFile: FigmaFile): Promise<KizuProject> {
    // Transform Figma JSON → PenPot structure
    return this.transformer.convert(figmaFile);
  }
}
```

#### 2.2 Advanced Feature Bridge
**Priority fixes:**
1. **Variables:** Parse Figma variables and map to PenPot tokens
2. **Component Properties:** Better variant mapping
3. **Blend Modes:** Improve approximations with fallback warnings
4. **Typography:** Enhanced font matching and fallback system

**Implementation:**
```typescript
// src/converters/variables-converter.ts
class VariablesConverter {
  convertFigmaVariables(figmaVars: Variable[]): PenpotTokens {
    return figmaVars.map(v => ({
      name: v.name,
      type: this.mapVariableType(v.resolvedType),
      value: this.convertValue(v.valuesByMode),
      modes: this.convertModes(v.modes)
    }));
  }
}
```

---

### Phase 3: Advanced Features (Months 4-6) - 98% Coverage

### Phase 4: Complete Parity (Months 7-12) - 100% Coverage
**Timeline:** Months 7-12

#### 4.1 Prototyping Complete Conversion
**Goal:** Full prototyping feature parity

**Features:**
- All interaction types (click, hover, drag, scroll)
- Conditional logic and expressions
- Variable manipulation in prototypes
- Smart animate transitions
- Component property interactions
- Advanced flow navigation

**Implementation:**
```typescript
// src/converters/prototyping-full-converter.ts
class PrototypingFullConverter {
  convertPrototype(figmaPrototype: FigmaPrototype): PenpotPrototype {
    return {
      interactions: this.convertAllInteractions(figmaPrototype.actions),
      conditionals: this.convertConditionals(figmaPrototype.conditions),
      variables: this.convertVariableBindings(figmaPrototype.variableBindings),
      transitions: this.convertTransitions(figmaPrototype.transitions)
    };
  }
}
```

#### 4.2 Plugin Ecosystem Bridge
**Goal:** Support Figma plugin outputs

**Approach:**
- Partner with PenPot on plugin API parity
- Create plugin output converters
- Document plugin migration guide
- Build plugin compatibility layer

#### 4.3 Dev Mode Feature Parity
**Goal:** Complete developer handoff features

**Features:**
- CSS code generation
- Component property inspection
- Spacing and layout measurements
- Asset export optimization
- Design token extraction

#### 4.4 Edge Cases & Long Tail
**Goal:** Handle the last 2% of rare features

**Tasks:**
- Comprehensive real-world file testing (1000+ files)
- Community feedback integration
- Bug fixes for edge cases
- Platform-specific quirks (Windows/Mac/Linux)
- Performance optimization for extreme files (10,000+ artboards)

**Quality Assurance:**
```typescript
// tests/compatibility/100-percent.test.ts
describe('100% Figma Compatibility', () => {
  test('imports 1000 real-world Figma files without errors', async () => {
    const files = await loadRealWorldFiles();
    const results = await Promise.all(files.map(importFile));

    const successRate = results.filter(r => r.success).length / files.length;
    expect(successRate).toBeGreaterThanOrEqual(0.99);
  });
});
```

#### 3.1 Prototyping Conversion
**Challenge:** PenPot prototyping differs significantly from Figma

**Approach:**
- Map basic interactions (click → navigate)
- Document unsupported interactions in import report
- Provide migration guide for manual recreation
- Future: Create prototyping compatibility layer

#### 3.2 Local .fig Parser (Experimental)
Use Evan Wallace's Kiwi library for direct .fig parsing:

**Pros:**
- Faster than plugin approach
- No Figma API dependency
- Access to raw data structures

**Cons:**
- Unstable format (can break with Figma updates)
- Reverse-engineering required
- Potential legal concerns

**Implementation Strategy:**
```bash
# Add kiwi parser dependency
npm install kiwi-schema

# Create parser wrapper
src/parsers/fig-file-parser.ts
```

**Use Case:** Power users with Master license who want maximum speed

#### 3.3 Validation & Error Reporting
```typescript
interface ImportReport {
  totalNodes: number;
  successfullyImported: number;
  warnings: ConversionWarning[];
  errors: ConversionError[];
  unsupportedFeatures: string[];
  compatibilityScore: number; // 0-100%
}
```

---

## Technical Implementation Details

### File Structure
```
src/
├── services/
│   ├── figma-importer.js           # Main import orchestrator
│   ├── figma-api-client.js         # Figma REST API wrapper
│   └── figma-plugin-wrapper.js     # Embedded plugin logic
├── converters/
│   ├── variables-converter.js      # Variables → Tokens
│   ├── components-converter.js     # Components → PenPot
│   ├── layout-converter.js         # Auto Layout → Flex
│   └── prototyping-converter.js    # Interactions (partial)
├── parsers/
│   ├── fig-file-parser.js          # Direct .fig parsing
│   └── kiwi-schema-loader.js       # Schema definitions
├── validators/
│   └── import-validator.js         # Quality checks
└── utils/
    ├── import-logger.js            # Detailed logging
    └── import-reporter.js          # Generate reports
```

### IPC Handlers
```javascript
// src/services/backend-ipc-handlers.js
ipcMain.handle('figma:import-file', handleFigmaImport);
ipcMain.handle('figma:import-url', handleFigmaURLImport);
ipcMain.handle('figma:batch-import', handleBatchImport);
ipcMain.handle('figma:get-import-progress', getImportProgress);
ipcMain.handle('figma:cancel-import', cancelImport);
```

### Preload API
```javascript
// src/preload.js
contextBridge.exposeInMainWorld('figmaAPI', {
  importFile: (filePath) => ipcRenderer.invoke('figma:import-file', filePath),
  importFromURL: (url, token) => ipcRenderer.invoke('figma:import-url', url, token),
  batchImport: (filePaths) => ipcRenderer.invoke('figma:batch-import', filePaths),
  onImportProgress: (callback) => ipcRenderer.on('import-progress', callback)
});
```

---

## UI/UX Design

### Import Modal
```
┌─────────────────────────────────────────────────┐
│  Import Figma Files                        [X]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  📤 Drop .fig files here or                     │
│  [Browse Files] [Import from URL]               │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ ✓ design-system.fig      (152 pages)     │ │
│  │ ✓ mobile-app.fig         (43 pages)      │ │
│  │ ⚠️ large-file.fig        (500 pages)      │ │
│  │   Warning: 50 pages over Starter limit   │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  Import Options:                                │
│  ☑ Import components as library                │
│  ☑ Preserve layer names                        │
│  ☐ Convert prototyping (beta)                  │
│                                                  │
│                 [Cancel]  [Import (3 files)]    │
└─────────────────────────────────────────────────┘
```

### Progress Feedback
```
┌─────────────────────────────────────────────────┐
│  Importing: design-system.fig               [X] │
├─────────────────────────────────────────────────┤
│                                                  │
│  Progress: 68 of 152 pages                     │
│  ████████████████░░░░░░░░░░ 45%                │
│                                                  │
│  Current: Converting components...              │
│  • Frame "Dashboard/Desktop"                    │
│  • 1,247 nodes processed                        │
│                                                  │
│  Warnings (3):                                  │
│  • Unsupported blend mode on Layer 42          │
│  • Variable "spacing/lg" approximated          │
│  • Prototype interactions not converted        │
│                                                  │
│  Elapsed: 2m 14s  |  Estimated: 3m 15s         │
│                                                  │
│                        [Cancel Import]          │
└─────────────────────────────────────────────────┘
```

---

## Performance Optimization

### Strategies
1. **Worker Threads:** Offload parsing to separate thread
2. **Streaming:** Process large files in chunks
3. **Caching:** Cache parsed component libraries
4. **Incremental Import:** Show partial results as they complete
5. **Memory Management:** Clear processed nodes from memory

**Code Example:**
```javascript
// src/services/import-worker.js
const { Worker } = require('worker_threads');

class ImportWorker {
  async importLargeFile(filePath) {
    const worker = new Worker('./parsers/fig-parser-worker.js');

    return new Promise((resolve, reject) => {
      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          this.emit('progress', msg.data);
        } else if (msg.type === 'complete') {
          resolve(msg.result);
        }
      });

      worker.postMessage({ filePath });
    });
  }
}
```

---

## Testing Strategy

### Test Coverage Goals
- **Unit Tests:** 80% coverage on converters
- **Integration Tests:** Full import → export → re-import cycle
- **Compatibility Tests:** Test against 50+ real Figma files
- **Performance Tests:** Handle 1000+ page files

### Test Suite Structure
```
tests/
├── unit/
│   ├── converters.test.js
│   ├── validators.test.js
│   └── parsers.test.js
├── integration/
│   ├── import-workflow.test.js
│   └── api-integration.test.js
├── fixtures/
│   ├── sample-files/
│   │   ├── simple-design.fig
│   │   ├── component-library.fig
│   │   └── complex-prototype.fig
└── compatibility/
    └── real-world-files.test.js
```

---

## Compatibility Scorecard

| Feature Category | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Figma Parity |
|------------------|---------|---------|---------|---------|---------|--------------|
| **Basic Shapes** | ✅ 100% | 100% | 100% | 100% | 100% | 100% |
| **Vectors** | ✅ 95% | 98% | 100% | 100% | 100% | 100% |
| **Text** | ✅ 90% | 95% | 98% | 99% | 100% | 100% |
| **Components** | ✅ 85% | 90% | 95% | 98% | 100% | 100% |
| **Auto Layout** | ✅ 80% | 85% | 92% | 96% | 99% | 100% |
| **Styles** | ✅ 85% | 90% | 95% | 98% | 100% | 100% |
| **Variables** | 🔴 20% | 50% | 80% | 95% | 100% | 100% |
| **Effects** | ✅ 75% | 80% | 88% | 94% | 99% | 100% |
| **Blend Modes** | 🟡 60% | 70% | 85% | 92% | 98% | 100% |
| **Prototyping** | 🔴 0% | 10% | 40% | 75% | 95% | 100% |
| **Plugins** | 🔴 0% | 0% | 0% | 20% | 60% | 100% |
| **Dev Mode** | 🔴 0% | 0% | 30% | 60% | 90% | 100% |
| **Edge Cases** | 🔴 50% | 70% | 85% | 95% | 98% | 100% |
| **Overall** | **70%** | **85%** | **92%** | **98%** | **99.5%** | **100%** |

---

## Dependencies

### Required Libraries
```json
{
  "dependencies": {
    "@figma/plugin-api-types": "^1.x",
    "jszip": "^3.10.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "kiwi-schema": "^1.x" // For .fig parsing (Phase 3)
  }
}
```

### External Resources
1. **PenPot Exporter Plugin:**
   - Repo: https://github.com/penpot/penpot-exporter-figma-plugin
   - License: MPL-2.0 (compatible)
   - Strategy: Fork and embed, contribute improvements upstream

2. **Figma API:**
   - Docs: https://www.figma.com/developers/api
   - OpenAPI Spec: https://github.com/figma/rest-api-spec
   - Rate Limits: 400 requests/min per token

3. **Kiwi Parser:**
   - Repo: https://github.com/evanw/kiwi
   - Parser Tool: https://madebyevan.com/figma/fig-file-parser/
   - Warning: Unstable format, use as fallback

---

## Risk Assessment

### High Risk ⚠️
1. **Format Instability:** Figma may change .fig format breaking parsers
   - **Mitigation:** Primary reliance on official plugin + API approach

2. **Performance:** Large files may crash/freeze the app
   - **Mitigation:** Worker threads, streaming, memory limits

3. **Legal:** Adobe-Figma merger may restrict export capabilities
   - **Mitigation:** Build robust import now before restrictions

### Medium Risk 🟡
1. **Feature Parity:** New Figma features won't be immediately supported
   - **Mitigation:** Quarterly updates, community contributions

2. **User Expectations:** Users expect 100% fidelity
   - **Mitigation:** Clear import reports, compatibility scores

### Low Risk ✅
1. **PenPot Changes:** PenPot format may evolve
   - **Mitigation:** Close collaboration with PenPot team, we control both ends

---

## Success Metrics

### Launch Goals (Phase 1)
- ✅ 85% of Figma files import without critical errors
- ✅ 95% of users successfully complete first import
- ✅ Average import time < 2 minutes for typical files
- ✅ Zero data loss on basic shapes, text, components

### Post-Launch Goals (Phase 4 - Complete Parity)
- ✅ 100% compatibility score across comprehensive test suite
- ✅ Import files up to 5GB (Master tier)
- ✅ Batch import 100+ files simultaneously
- ✅ User satisfaction score > 4.8/5 on import quality
- ✅ Zero feature gaps vs Figma (documented compatibility matrix)
- ✅ Community-validated with 1000+ real-world files
- ✅ Performance benchmarks: <5min for 1000-page files

---

## Roadmap

### Months 1-2: Foundation
- [ ] Integrate PenPot exporter plugin
- [ ] Build desktop import UI
- [ ] Implement license-based limits
- [ ] Basic error handling
- [ ] Launch with 85% coverage

### Months 3-4: Enhancement
- [ ] Figma API integration for URLs
- [ ] Improved variable conversion
- [ ] Better blend mode handling
- [ ] Batch import
- [ ] Reach 92% coverage

### Months 5-6: Advanced
- [ ] Local .fig parser (experimental)
- [ ] Prototyping partial support
- [ ] Import validation suite
- [ ] Performance optimization
- [ ] Reach 98% coverage

### Months 7-12: Complete Parity (100%)
- [ ] Full prototyping conversion (all interactions, conditionals, variables)
- [ ] Plugin ecosystem bridge (when PenPot releases plugins)
- [ ] Complete dev mode features (code gen, inspect, measurements)
- [ ] Edge case handling (1000+ real-world file testing)
- [ ] Performance optimization (handle 10,000+ artboard files)
- [ ] Community contribution integration
- [ ] Platform-specific quirks (Windows/Mac/Linux)
- [ ] **Target: 100% compatibility - complete feature parity**

---

## Developer Notes

### Getting Started
```bash
# Clone PenPot exporter for reference
git clone https://github.com/penpot/penpot-exporter-figma-plugin.git

# Install dependencies
npm install

# Test basic import
npm run test:import
```

### Key Files to Implement
1. `src/services/figma-importer.js` - Main service
2. `src/converters/figma-to-penpot.js` - Core converter
3. `src/ui/import-modal.jsx` - UI component
4. `tests/import-compatibility.test.js` - Test suite

### Architecture Decisions
- **Why not pure Figma API?** Rate limits + requires tokens for all imports
- **Why not pure .fig parsing?** Unstable format, reverse-engineering effort
- **Why embed plugin?** Better UX, no separate plugin install required
- **Why three paths?** Different use cases, redundancy if one breaks

---

## Conclusion

This architecture enables Kizu to achieve **100% Figma compatibility** by:

1. ✅ Leveraging existing open-source tools (PenPot exporter)
2. ✅ Building on stable APIs (Figma REST API)
3. ✅ Providing multiple import paths for flexibility
4. ✅ Implementing incremental improvements post-launch
5. ✅ Maintaining clear compatibility tracking
6. ✅ Community-driven testing with real-world files
7. ✅ Dedicated engineering effort for edge cases
8. ✅ Long-term commitment to feature parity

**Target Delivery:**
- **Phase 1 (Launch):** 85% compatibility, 4 weeks
- **Phase 2 (Enhancement):** 92% compatibility, +2 months
- **Phase 3 (Advanced):** 98% compatibility, +4 months
- **Phase 4 (Complete Parity):** 100% compatibility, +6 months

**Minimum Acceptable Threshold: 98%**
**Ultimate Goal: 100% complete feature parity**

This positions Kizu as the **only 100% compatible Figma alternative** with the industry's best import experience - not "close enough" but **pixel-perfect, feature-complete** parity.
