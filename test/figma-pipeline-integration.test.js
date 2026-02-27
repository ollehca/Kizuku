/**
 * Figma Pipeline Integration Test
 * Tests the full conversion pipeline:
 * Figma JSON → FigmaJSONConverter → .kizuku project → kizuku-to-penpot-converter → PenPot file
 */

const converter = require('../src/services/figma/figma-json-converter');
const penpotConverter = require('../src/services/kizuku-to-penpot-converter');

let passed = 0;
let failed = 0;

/**
 * Assert actual equals expected
 * @param {string} name - Test name
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 */
function assert(name, actual, expected) {
  const act = JSON.stringify(actual);
  const exp = JSON.stringify(expected);
  if (act === exp) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
    console.log(`    Expected: ${exp}`);
    console.log(`    Got:      ${act}`);
  }
}

/**
 * Assert value is truthy
 * @param {string} name - Test name
 * @param {*} actual - Value to check
 */
function assertTrue(name, actual) {
  if (actual) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL: ${name} — expected truthy, got ${actual}`);
  }
}

/**
 * Build a synthetic Figma document for testing
 * @returns {object} Figma document structure
 */
function buildTestFigmaDocument() {
  return {
    name: 'Integration Test',
    version: '1.0',
    document: {
      id: '0:0',
      type: 'DOCUMENT',
      name: 'Document',
      children: [buildTestCanvas()],
    },
    _meta: {
      extractedImages: [
        { hash: 'img-abc123', data: 'base64data==', mtype: 'image/png' },
      ],
    },
  };
}

/**
 * Build a test canvas with diverse node types
 * @returns {object} Figma canvas node
 */
function buildTestCanvas() {
  return {
    id: '0:1',
    type: 'CANVAS',
    name: 'Test Page',
    children: [
      buildTestFrame(),
      buildTestText(),
      buildTestVector(),
      buildTestEllipse(),
    ],
  };
}

/**
 * Build a test frame with auto-layout and nested children
 * @returns {object} Figma FRAME node
 */
function buildTestFrame() {
  return {
    id: '1:1',
    type: 'FRAME',
    name: 'AutoLayout Frame',
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    size: { x: 400, y: 300 },
    fills: [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    layoutMode: 'HORIZONTAL',
    itemSpacing: 16,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'MIN',
    layoutWrap: 'NO_WRAP',
    clipsContent: true,
    children: [buildTestRect(), buildTestGroup()],
  };
}

/**
 * Build a test rectangle node
 * @returns {object} Figma RECTANGLE node
 */
function buildTestRect() {
  return {
    id: '2:1',
    type: 'RECTANGLE',
    name: 'Colored Rect',
    absoluteBoundingBox: { x: 12, y: 8, width: 100, height: 50 },
    size: { x: 100, y: 50 },
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.8, visible: true }],
    strokes: [{ color: { r: 0, g: 0, b: 0 }, opacity: 1, weight: 2 }],
    effects: [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 2, y: 4 },
        radius: 8, spread: 0, visible: true },
    ],
    cornerRadius: 8,
    rectangleCornerRadii: [8, 8, 8, 8],
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
  };
}

/**
 * Build a test group with a nested child
 * @returns {object} Figma GROUP node
 */
function buildTestGroup() {
  return {
    id: '3:1',
    type: 'GROUP',
    name: 'Nested Group',
    absoluteBoundingBox: { x: 120, y: 8, width: 200, height: 100 },
    size: { x: 200, y: 100 },
    fills: [],
    strokes: [],
    effects: [],
    children: [{
      id: '4:1',
      type: 'RECTANGLE',
      name: 'Inside Group',
      absoluteBoundingBox: { x: 130, y: 18, width: 50, height: 50 },
      size: { x: 50, y: 50 },
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1, visible: true }],
      strokes: [],
      effects: [],
    }],
  };
}

/**
 * Build a test text node
 * @returns {object} Figma TEXT node
 */
function buildTestText() {
  return {
    id: '5:1',
    type: 'TEXT',
    name: 'Hello Text',
    absoluteBoundingBox: { x: 0, y: 320, width: 200, height: 40 },
    size: { x: 200, y: 40 },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    characters: 'Hello World',
    style: {
      fontFamily: 'Inter',
      fontPostScriptName: 'Inter-Regular',
      fontSize: 16,
      fontWeight: 400,
      lineHeightPx: 24,
      letterSpacing: 0,
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
    },
    textAutoResize: 'HEIGHT',
  };
}

/**
 * Build a test vector (path) node
 * @returns {object} Figma VECTOR node
 */
function buildTestVector() {
  return {
    id: '6:1',
    type: 'VECTOR',
    name: 'Triangle Path',
    absoluteBoundingBox: { x: 0, y: 380, width: 100, height: 100 },
    size: { x: 100, y: 100 },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.8, b: 0 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    fillGeometry: [{ path: 'M0 100 L50 0 L100 100 Z', windingRule: 'NONZERO' }],
  };
}

/**
 * Build a test ellipse node
 * @returns {object} Figma ELLIPSE node
 */
function buildTestEllipse() {
  return {
    id: '7:1',
    type: 'ELLIPSE',
    name: 'Circle',
    absoluteBoundingBox: { x: 120, y: 380, width: 80, height: 80 },
    size: { x: 80, y: 80 },
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0, b: 0.5 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
  };
}

/**
 * Run all integration tests
 */
async function runTests() {
  console.log('\n--- Pipeline Integration Tests ---');

  const figmaDoc = buildTestFigmaDocument();
  const conv = new converter.FigmaJSONConverter();
  const result = await conv.convert(figmaDoc);

  testKizuProjectStructure(result);
  testKizuPageContent(result);
  testImageAssets(result);

  const penpotFile = penpotConverter.convertKizukuToPenpotFile(result.project);
  testPenpotFileStructure(penpotFile);
  testPenpotShapes(penpotFile);
  testPenpotMedia(penpotFile);
  testPenpotHierarchy(penpotFile);

  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test .kizuku project skeleton
 * @param {object} result - Conversion result
 */
function testKizuProjectStructure(result) {
  assertTrue('conversion success', result.project);
  assertTrue('has metadata id', result.project.metadata.id);
  assertTrue('has pages', result.project.data.pages.length > 0);
  assert('project name', result.project.metadata.name, 'Integration Test');
  assertTrue('has compatibility score', result.compatibilityScore >= 0);
  assertTrue('has stats', result.stats.totalNodes > 0);
}

/**
 * Test .kizuku page content has converted children
 * @param {object} result - Conversion result
 */
function testKizuPageContent(result) {
  const page = result.project.data.pages[0];
  assertTrue('page has children', page.children.length > 0);
  assertTrue('page has name', page.name === 'Test Page');

  const frame = page.children.find((c) => c.type === 'frame');
  assertTrue('frame found', frame);
  assertTrue('frame has children', frame?.children?.length > 0);

  const text = page.children.find((c) => c.type === 'text');
  assertTrue('text found', text);
  assertTrue('text has content', text?.content);
}

/**
 * Test extracted images are in project assets
 * @param {object} result - Conversion result
 */
function testImageAssets(result) {
  const images = result.project.assets.images;
  assertTrue('has images array', Array.isArray(images));
  assertTrue('has extracted image', images.length > 0);
  assert('image hash', images[0].hash, 'img-abc123');
  assertTrue('image has data', images[0].data);
}

/**
 * Test PenPot file structure
 * @param {object} penpotFile - PenPot file
 */
function testPenpotFileStructure(penpotFile) {
  assertTrue('penpot has id', penpotFile.id);
  assert('penpot version', penpotFile.version, 22);
  assertTrue('penpot has pages', penpotFile.data.pages.length > 0);

  const pageId = penpotFile.data.pages[0];
  const page = penpotFile.data['pages-index'][pageId];
  assertTrue('page exists in index', page);
  assertTrue('page has objects', Object.keys(page.objects).length > 0);
}

/**
 * Test PenPot shape properties are complete
 * @param {object} penpotFile - PenPot file
 */
function testPenpotShapes(penpotFile) {
  const pageId = penpotFile.data.pages[0];
  const objects = penpotFile.data['pages-index'][pageId].objects;

  const shapes = Object.values(objects).filter(
    (obj) => obj.id !== '00000000-0000-0000-0000-000000000000'
  );

  for (const shape of shapes) {
    assertTrue(`${shape.name} has id`, shape.id);
    assertTrue(`${shape.name} has type`, shape.type);
    assertTrue(`${shape.name} has frame-id`, shape['frame-id']);
    assertTrue(`${shape.name} has parent-id`, shape['parent-id']);
    assertTrue(`${shape.name} has selrect`, shape.selrect);
    assertTrue(`${shape.name} has points`, shape.points);
    assertTrue(`${shape.name} has transform`, shape.transform);
  }
}

/**
 * Test PenPot media map from images
 * @param {object} penpotFile - PenPot file
 */
function testPenpotMedia(penpotFile) {
  const media = penpotFile.data.media;
  assertTrue('has media map', media);
  assertTrue('has image entry', media['img-abc123']);
  assert('media id', media['img-abc123'].id, 'img-abc123');
  assert('media mtype', media['img-abc123'].mtype, 'image/png');
}

/**
 * Test PenPot parent/frame hierarchy is correct
 * @param {object} penpotFile - PenPot file
 */
function testPenpotHierarchy(penpotFile) {
  const pageId = penpotFile.data.pages[0];
  const objects = penpotFile.data['pages-index'][pageId].objects;
  const rootId = '00000000-0000-0000-0000-000000000000';
  const root = objects[rootId];

  assertTrue('root frame exists', root);
  assertTrue('root has child shapes', root.shapes.length > 0);

  for (const childId of root.shapes) {
    const child = objects[childId];
    assertTrue(`top-level child ${childId} exists`, child);
  }
}

(async () => {
  const failures = await runTests();
  process.exit(failures > 0 ? 1 : 0);
})();
