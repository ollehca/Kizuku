/**
 * Figma Pipeline Integration Test
 * Tests the full conversion pipeline:
 * Figma JSON → FigmaJSONConverter → .kiz project → kizuku-to-penpot-converter → PenPot file
 */

const converter = require('../src/services/figma/figma-json-converter');
const penpotConverter = require('../src/services/kizuku-to-penpot-converter');
const overrides = require('../src/services/figma/kizuku-override-resolver');
const nodeTransformer = require('../src/services/figma/kizuku-node-transformer');
const maskTransformer = require('../src/services/figma/kizuku-mask-transformer');

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
      extractedImages: [{ hash: 'img-abc123', data: 'base64data==', mtype: 'image/png' }],
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
    children: [buildTestFrame(), buildTestText(), buildTestVector(), buildTestEllipse()],
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
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 2, y: 4 },
        radius: 8,
        spread: 0,
        visible: true,
      },
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
    children: [
      {
        id: '4:1',
        type: 'RECTANGLE',
        name: 'Inside Group',
        absoluteBoundingBox: { x: 130, y: 18, width: 50, height: 50 },
        size: { x: 50, y: 50 },
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1, visible: true }],
        strokes: [],
        effects: [],
      },
    ],
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
  testOverridePathTargeting();
  testComponentPropertyTypes();
  testSwapComponent();
  testDiagonalLine();
  testMaskFromJsonInput();
  testOverrideIdMapping();
  await testStyleRefsMapToUuids();
  testOverrideGeometryFields();

  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test .kiz project skeleton
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
 * Test .kiz page content has converted children
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

/**
 * Test override path targeting with semicolons for nested overrides
 */
function testOverridePathTargeting() {
  const instance = {
    children: [
      {
        id: 'outer-1',
        name: 'Outer',
        children: [{ id: 'inner-1', name: 'Inner', opacity: 1 }],
      },
      { id: 'sibling-1', name: 'Sibling', opacity: 1 },
    ],
  };
  const figmaNode = {
    overrides: [
      {
        id: 'outer-1;inner-1',
        overriddenFields: { opacity: 0.5 },
      },
      {
        id: 'sibling-1',
        overriddenFields: { name: 'Renamed' },
      },
    ],
  };
  const touched = overrides.resolveOverrides(instance, figmaNode);
  const inner = instance.children[0].children[0];
  assert('nested override opacity', inner.opacity, 0.5);
  const sibling = instance.children[1];
  assert('direct override name', sibling.name, 'Renamed');
  assertTrue('touched has layer group', touched.has('layer-effects-group'));
  assertTrue('touched has name group', touched.has('name-group'));

  const directFind = overrides.findChildById(instance.children, 'inner-1');
  assertTrue('findChildById recursive', directFind && directFind.id === 'inner-1');
}

/**
 * Test typed component property resolution (BOOLEAN, INSTANCE_SWAP)
 */
function testComponentPropertyTypes() {
  const instance = {
    id: 'inst-1',
    name: 'Button',
    visible: true,
    children: [],
  };
  const figmaNode = {
    componentPropertyReferences: {
      visible: 'showIcon',
      characters: 'labelText',
    },
    componentProperties: {
      showIcon: { type: 'BOOLEAN', value: false },
      labelText: { type: 'TEXT', value: 'Click Me' },
    },
  };
  overrides.resolveComponentProperties(instance, figmaNode);
  assert('boolean prop coerced', instance.visible, false);
  assert('text prop applied', instance.characters, 'Click Me');
}

/**
 * Test instance swap via swappableComponentId
 */
function testSwapComponent() {
  const instance = {
    id: 'inst-2',
    name: 'Swappable',
    children: [],
  };
  const figmaNode = {
    swappableComponentId: 'comp-abc-123',
  };
  overrides.resolveComponentProperties(instance, figmaNode);
  assert('swap component id', instance.swappedComponentId, 'comp-abc-123');

  const instSwap = {
    id: 'inst-3',
    name: 'Via Prop',
    children: [],
  };
  const figNodeSwap = {
    componentPropertyReferences: { icon: 'iconProp' },
    componentProperties: {
      iconProp: { type: 'INSTANCE_SWAP', value: 'swap-target-id' },
    },
  };
  overrides.resolveComponentProperties(instSwap, figNodeSwap);
  assert('instance swap via prop', instSwap.swappedComponentId, 'swap-target-id');
}

/**
 * Test diagonal line uses bounding box height for endpoint
 */
function testDiagonalLine() {
  const diagonal = nodeTransformer.transformLineToPath({
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
  });
  assert('diagonal line x', diagonal[1].x, 100);
  assert('diagonal line y', diagonal[1].y, 50);

  const horizontal = nodeTransformer.transformLineToPath({
    absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 0 },
  });
  assert('horizontal line y', horizontal[1].y, 0);
}

/**
 * Test that isMask propagates from JSON input and mask grouping works
 */
/**
 * Test that style refs are converted to UUIDs matching library entries
 */
async function testStyleRefsMapToUuids() {
  const doc = {
    name: 'Style Ref Test',
    version: '1.0',
    document: {
      id: '0:0',
      type: 'DOCUMENT',
      name: 'Document',
      children: [
        {
          id: '0:1',
          type: 'CANVAS',
          name: 'Page',
          children: [
            {
              id: '1:1',
              type: 'RECTANGLE',
              name: 'Styled Rect',
              absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
              size: { x: 100, y: 50 },
              fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1, visible: true }],
              strokes: [],
              effects: [],
              styles: { fill: 'S:style-abc-123' },
            },
          ],
        },
      ],
    },
    styles: {
      'S:style-abc-123': { name: 'Primary Red', styleType: 'FILL' },
    },
  };
  const conv = new converter.FigmaJSONConverter();
  const result = await conv.convert(doc);
  const page = result.project.data.pages[0];
  const rect = page.children.find((c) => c.name === 'Styled Rect');
  assertTrue('styleRefs exist', rect?.styleRefs);
  const fillRef = rect.styleRefs.fill;
  assertTrue('fill ref is UUID format', fillRef && fillRef.includes('-'));
  assert('fill ref not raw figma id', fillRef === 'S:style-abc-123', false);

  const colorLib = result.project.data.colorLibrary;
  const matchingColor = colorLib.find((c) => c.id === fillRef);
  assertTrue('color library entry matches ref', matchingColor);
}

/**
 * Test that isMask propagates from JSON input and mask grouping works
 */
function testMaskFromJsonInput() {
  const children = [
    { id: 'mask-shape', name: 'Mask', isMask: true, opacity: 1 },
    { id: 'masked-child', name: 'Content', opacity: 1 },
    { id: 'unmasked', name: 'Outside', opacity: 1 },
  ];
  assertTrue('has mask child', maskTransformer.hasMaskChild(children));

  const grouped = maskTransformer.groupChildrenWithMasks(children);
  assertTrue('grouped has mask group', grouped.length >= 1);

  const maskGroup = grouped.find((c) => c.type === 'MASK_GROUP');
  assertTrue('mask group created', maskGroup);
  assertTrue('mask group flagged', maskGroup?.isMaskedGroup);

  const noMask = [
    { id: 'a', name: 'Normal', opacity: 1 },
    { id: 'b', name: 'Also Normal', opacity: 1 },
  ];
  assert('no mask returns same', maskTransformer.hasMaskChild(noMask), false);
}

/**
 * Test that override IDs are translated through UUID mapper
 */
function testOverrideIdMapping() {
  const uuidMap = new Map();
  uuidMap.set('1:42', 'uuid-aaa');
  uuidMap.set('1:43', 'uuid-bbb');
  const idMapper = (fid) => uuidMap.get(fid) || fid;

  const instance = {
    children: [
      {
        id: 'uuid-aaa',
        name: 'Child',
        opacity: 1,
        children: [{ id: 'uuid-bbb', name: 'Nested', opacity: 1 }],
      },
    ],
  };
  const figmaNode = {
    overrides: [
      { id: '1:42;1:43', overriddenFields: { opacity: 0.3 } },
      { id: '1:42', overriddenFields: { name: 'Mapped' } },
    ],
  };
  const touched = overrides.resolveOverrides(instance, figmaNode, idMapper);
  const nested = instance.children[0].children[0];
  assert('mapped nested override opacity', nested.opacity, 0.3);
  assert('mapped direct override name', instance.children[0].name, 'Mapped');
  assertTrue('mapped touched has groups', touched.size > 0);
}

/**
 * Test override handlers for geometry fields
 */
function testOverrideGeometryFields() {
  const instance = {
    id: 'inst-geo',
    children: [
      {
        id: 'child-geo',
        cornerRadius: 4,
        width: 100,
        height: 50,
        rotation: 0,
        blendMode: 'NORMAL',
      },
    ],
  };
  const figmaNode = {
    overrides: [
      {
        id: 'child-geo',
        overriddenFields: {
          cornerRadius: 12,
          width: 200,
          height: 80,
          rotation: 45,
          blendMode: 'MULTIPLY',
        },
      },
    ],
  };
  const touched = overrides.resolveOverrides(instance, figmaNode, null);
  const child = instance.children[0];
  assert('override cornerRadius', child.cornerRadius, 12);
  assertTrue('override has cornerRadii', child.cornerRadii !== undefined);
  assert('override cornerRadii.topLeft', child.cornerRadii.topLeft, 12);
  assert('override width', child.width, 200);
  assert('override height', child.height, 80);
  assert('override rotation', child.rotation, 45);
  assert('override blendMode', child.blendMode, 'MULTIPLY');
  assertTrue('touched has geometry', touched.has('geometry-group'));
  assertTrue('touched has size', touched.has('size-group'));
  assertTrue('touched has rotation', touched.has('rotation-group'));
}

(async () => {
  const failures = await runTests();
  process.exit(failures > 0 ? 1 : 0);
})();
