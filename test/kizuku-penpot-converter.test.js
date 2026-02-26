/**
 * Tests for Kizuku to PenPot Converter (end-to-end)
 * Tests the full conversion pipeline from kizuku format to PenPot flat format.
 */

const converter = require('../src/services/kizuku-to-penpot-converter');

let passed = 0;
let failed = 0;

/**
 * Assert that actual equals expected
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
 * Run all converter tests
 */
function runTests() {
  console.log('\n--- PenPot Converter Tests ---');
  testHardcodedFile();
  testEmptyProject();
  testRectangleConversion();
  testFrameWithChildren();
  testPathConversion();
  testEffectsConversion();
  testLayoutConversion();
  testContainerTypes();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Build a minimal kizuku project for testing
 * @param {array} pages - Pages array
 * @returns {object} Kizuku project
 */
function buildProject(pages) {
  return {
    metadata: {
      id: 'test-id',
      name: 'Test Project',
      created: '2024-01-01T00:00:00Z',
      modified: '2024-01-01T00:00:00Z',
    },
    data: { pages },
  };
}

/**
 * Test hardcoded test file creation
 */
function testHardcodedFile() {
  const file = converter.createHardcodedTestFile();
  assertTrue('has id', file.id);
  assertTrue('has pages', file.data.pages.length > 0);
  const pageId = file.data.pages[0];
  const page = file.data['pages-index'][pageId];
  assertTrue('page has objects', Object.keys(page.objects).length > 0);
}

/**
 * Test empty project conversion
 */
function testEmptyProject() {
  const result = converter.convertKizukuToPenpotFile(buildProject([]));
  assert('project id', result.id, 'test-id');
  assert('no pages', result.data.pages.length, 0);
  assert('version', result.version, 22);
}

/**
 * Test rectangle node conversion
 */
function testRectangleConversion() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'rect-1',
      name: 'My Rect',
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      fills: [{ type: 'color', color: '#ff0000', opacity: 1 }],
      strokes: [],
      cornerRadius: 8,
      cornerRadii: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 },
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const rect = page.objects['rect-1'];

  assertTrue('rect exists', rect);
  assert('rect type', rect.type, 'rect');
  assert('rect x', rect.x, 10);
  assert('rect width', rect.width, 100);
  assert('rect fill color', rect.fills[0]['fill-color'], '#ff0000');
  assert('rect r1', rect.r1, 8);
}

/**
 * Test frame with nested children
 */
function testFrameWithChildren() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'frame-1',
      name: 'Container',
      type: 'frame',
      x: 0, y: 0, width: 400, height: 300,
      fills: [], strokes: [],
      children: [{
        id: 'child-1',
        name: 'Inside',
        type: 'rect',
        x: 10, y: 10, width: 50, height: 50,
        fills: [], strokes: [],
      }],
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];

  const frame = page.objects['frame-1'];
  assertTrue('frame has child shapes', frame.shapes.length > 0);
  assert('frame child id', frame.shapes[0], 'child-1');

  const child = page.objects['child-1'];
  assert('child parent-id', child['parent-id'], 'frame-1');
  assert('child frame-id', child['frame-id'], 'frame-1');
}

/**
 * Test path node conversion
 */
function testPathConversion() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'path-1',
      name: 'Vector',
      type: 'path',
      x: 0, y: 0, width: 100, height: 100,
      fills: [], strokes: [],
      commands: [
        { command: 'M', x: 0, y: 0 },
        { command: 'L', x: 100, y: 0 },
        { command: 'Z' },
      ],
      fillRule: 'evenodd',
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const path = page.objects['path-1'];

  assertTrue('path has content', path.content);
  assertTrue('path has segments', path.content.length > 0);
  assert('path fill-rule', path['fill-rule'], 'evenodd');
}

/**
 * Test effects conversion (shadows and blur)
 */
function testEffectsConversion() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'fx-1',
      name: 'FX Rect',
      type: 'rect',
      x: 0, y: 0, width: 100, height: 100,
      fills: [], strokes: [],
      effects: [
        { type: 'drop-shadow', color: '#000', offsetX: 2, offsetY: 4, blur: 8, spread: 1 },
        { type: 'blur', value: 5 },
      ],
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const rect = page.objects['fx-1'];

  assertTrue('has shadow', rect.shadow && rect.shadow.length > 0);
  assert('shadow blur', rect.shadow[0].blur, 8);
  assertTrue('has blur', rect.blur);
  assert('blur value', rect.blur.value, 5);
}

/**
 * Test layout properties on frames
 */
function testLayoutConversion() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'layout-1',
      name: 'Flex Frame',
      type: 'frame',
      x: 0, y: 0, width: 400, height: 300,
      fills: [], strokes: [],
      children: [],
      layout: {
        layout: 'flex',
        layoutFlexDir: 'row',
        layoutGap: { rowGap: 8, columnGap: 8 },
        layoutPadding: { p1: 16, p2: 16, p3: 16, p4: 16 },
        layoutJustifyContent: 'center',
        layoutAlignItems: 'start',
        layoutWrapType: 'nowrap',
      },
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const frame = page.objects['layout-1'];

  assert('layout flex', frame.layout, 'flex');
  assert('layout dir', frame['layout-flex-dir'], 'row');
  assert('layout justify', frame['layout-justify-content'], 'center');
}

/**
 * Test that container types get proper frame-id
 */
function testContainerTypes() {
  const project = buildProject([{
    id: 'page-1',
    name: 'Test Page',
    children: [{
      id: 'group-1',
      name: 'Group',
      type: 'group',
      x: 0, y: 0, width: 100, height: 100,
      fills: [], strokes: [],
      children: [{
        id: 'inside-1',
        name: 'Inside Group',
        type: 'rect',
        x: 0, y: 0, width: 50, height: 50,
        fills: [], strokes: [],
      }],
    }],
  }]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const child = page.objects['inside-1'];

  assert('group child frame-id', child['frame-id'], 'group-1');
  assert('group child parent-id', child['parent-id'], 'group-1');
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
