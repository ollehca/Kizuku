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
  testExportSettings();
  testShapeRefOnInstances();
  testNestedShapeRef();
  testAffineTransformGeometry();
  testMaskChildOrdering();
  testImageMediaDimensions();
  testRotatedParentCoords();
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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
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
        },
      ],
    },
  ]);

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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'frame-1',
          name: 'Container',
          type: 'frame',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'child-1',
              name: 'Inside',
              type: 'rect',
              x: 10,
              y: 10,
              width: 50,
              height: 50,
              fills: [],
              strokes: [],
            },
          ],
        },
      ],
    },
  ]);

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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'path-1',
          name: 'Vector',
          type: 'path',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fills: [],
          strokes: [],
          commands: [
            { command: 'M', x: 0, y: 0 },
            { command: 'L', x: 100, y: 0 },
            { command: 'Z' },
          ],
          fillRule: 'evenodd',
        },
      ],
    },
  ]);

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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'fx-1',
          name: 'FX Rect',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fills: [],
          strokes: [],
          effects: [
            { type: 'drop-shadow', color: '#000', offsetX: 2, offsetY: 4, blur: 8, spread: 1 },
            { type: 'blur', value: 5 },
          ],
        },
      ],
    },
  ]);

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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'layout-1',
          name: 'Flex Frame',
          type: 'frame',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          fills: [],
          strokes: [],
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
        },
      ],
    },
  ]);

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
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'group-1',
          name: 'Group',
          type: 'group',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'inside-1',
              name: 'Inside Group',
              type: 'rect',
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              fills: [],
              strokes: [],
            },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const child = page.objects['inside-1'];

  assert('group child frame-id', child['frame-id'], 'group-1');
  assert('group child parent-id', child['parent-id'], 'group-1');
}

/**
 * Test export settings conversion from Figma to PenPot exports
 */
function testExportSettings() {
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'exp-1',
          name: 'Exportable',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fills: [],
          strokes: [],
          exportSettings: [
            { format: 'PNG', suffix: '@2x', constraint: { value: 2 } },
            { format: 'SVG', suffix: '', constraint: { value: 1 } },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const shape = page.objects['exp-1'];

  assertTrue('has exports', Array.isArray(shape.exports));
  assert('export count', shape.exports.length, 2);
  assert('png type', shape.exports[0].type, 'png');
  assert('png suffix', shape.exports[0].suffix, '@2x');
  assert('png scale', shape.exports[0].scale, 2);
  assert('svg type', shape.exports[1].type, 'svg');
}

/**
 * Test that instance children get shape-ref pointing to component children
 */
function testShapeRefOnInstances() {
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'comp-1',
          name: 'Button',
          type: 'component',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'comp-label',
              name: 'Label',
              type: 'text',
              x: 10,
              y: 5,
              width: 80,
              height: 20,
              fills: [],
              strokes: [],
            },
            {
              id: 'comp-bg',
              name: 'Background',
              type: 'rect',
              x: 0,
              y: 0,
              width: 200,
              height: 40,
              fills: [],
              strokes: [],
            },
          ],
        },
        {
          id: 'inst-1',
          name: 'Button Instance',
          type: 'instance',
          componentId: 'comp-1',
          x: 300,
          y: 0,
          width: 200,
          height: 40,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'inst-label',
              name: 'Label',
              type: 'text',
              x: 10,
              y: 5,
              width: 80,
              height: 20,
              fills: [],
              strokes: [],
            },
            {
              id: 'inst-bg',
              name: 'Background',
              type: 'rect',
              x: 0,
              y: 0,
              width: 200,
              height: 40,
              fills: [],
              strokes: [],
            },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];

  const instLabel = page.objects['inst-label'];
  const instBg = page.objects['inst-bg'];
  const instRoot = page.objects['inst-1'];

  assert('inst root shape-ref', instRoot['shape-ref'], 'comp-1');
  assert('inst label shape-ref', instLabel['shape-ref'], 'comp-label');
  assert('inst bg shape-ref', instBg['shape-ref'], 'comp-bg');
}

/**
 * Test shape-ref works recursively for nested children
 */
function testNestedShapeRef() {
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'comp-card',
          name: 'Card',
          type: 'component',
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'comp-inner',
              name: 'Inner Frame',
              type: 'frame',
              x: 10,
              y: 10,
              width: 280,
              height: 180,
              fills: [],
              strokes: [],
              children: [
                {
                  id: 'comp-title',
                  name: 'Title',
                  type: 'text',
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 20,
                  fills: [],
                  strokes: [],
                },
              ],
            },
          ],
        },
        {
          id: 'inst-card',
          name: 'Card Instance',
          type: 'instance',
          componentId: 'comp-card',
          x: 400,
          y: 0,
          width: 300,
          height: 200,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'inst-inner',
              name: 'Inner Frame',
              type: 'frame',
              x: 10,
              y: 10,
              width: 280,
              height: 180,
              fills: [],
              strokes: [],
              children: [
                {
                  id: 'inst-title',
                  name: 'Title',
                  type: 'text',
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 20,
                  fills: [],
                  strokes: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];

  const instInner = page.objects['inst-inner'];
  const instTitle = page.objects['inst-title'];

  assert('nested inner shape-ref', instInner['shape-ref'], 'comp-inner');
  assert('nested title shape-ref', instTitle['shape-ref'], 'comp-title');
}

/**
 * Test affine transform produces correct points for scaled shapes
 */
function testAffineTransformGeometry() {
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'scaled-1',
          name: 'Scaled Rect',
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          fills: [],
          strokes: [],
          relativeTransform: [
            [2, 0, 0],
            [0, 1, 0],
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const shape = page.objects['scaled-1'];

  assertTrue('has points', Array.isArray(shape.points));
  assert('points count', shape.points.length, 4);
  assert('scaled point 1 x', shape.points[1].x, 200);
  assert('selrect width unchanged', shape.selrect.width, 100);

  const noTransform = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'plain-1',
          name: 'Plain Rect',
          type: 'rect',
          x: 10,
          y: 20,
          width: 50,
          height: 30,
          fills: [],
          strokes: [],
          rotation: 0,
        },
      ],
    },
  ]);
  const result2 = converter.convertKizukuToPenpotFile(noTransform);
  const page2 = result2.data['pages-index'][result2.data.pages[0]];
  const plain = page2.objects['plain-1'];
  assert('plain point 1 x', plain.points[1].x, 60);
  assert('plain point 1 y', plain.points[1].y, 20);
}

/**
 * Test masked group has mask child first in shapes array
 */
function testMaskChildOrdering() {
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'mask-group-1',
          name: 'Masked Container',
          type: 'group',
          isMaskedGroup: true,
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          fills: [],
          strokes: [],
          children: [
            {
              id: 'mask-shape',
              name: 'Circle Mask',
              type: 'circle',
              x: 0,
              y: 0,
              width: 200,
              height: 200,
              fills: [{ type: 'color', color: '#000', opacity: 1 }],
              strokes: [],
            },
            {
              id: 'masked-content',
              name: 'Photo',
              type: 'rect',
              x: 0,
              y: 0,
              width: 200,
              height: 200,
              fills: [],
              strokes: [],
            },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const group = page.objects['mask-group-1'];

  assertTrue('mask group exists', group);
  assert('masked-group flag', group['masked-group'], true);
  assert('mask shape is first child', group.shapes[0], 'mask-shape');
  assert('masked content is second', group.shapes[1], 'masked-content');
}

/**
 * Test that image media map parses dimensions from base64 data
 */
function testImageMediaDimensions() {
  const pngHeader = Buffer.alloc(24);
  pngHeader[0] = 0x89;
  pngHeader[1] = 0x50;
  pngHeader[2] = 0x4e;
  pngHeader[3] = 0x47;
  pngHeader.writeUInt32BE(320, 16);
  pngHeader.writeUInt32BE(240, 20);

  const project = buildProject([]);
  project.assets = {
    images: [
      {
        hash: 'test-img-001',
        data: pngHeader.toString('base64'),
        mtype: 'image/png',
      },
    ],
  };

  const result = converter.convertKizukuToPenpotFile(project);
  const media = result.data.media;
  assertTrue('media entry exists', media['test-img-001']);
  assert('parsed width', media['test-img-001'].width, 320);
  assert('parsed height', media['test-img-001'].height, 240);
}

/**
 * Test rotated parent coordinate transformation
 */
function testRotatedParentCoords() {
  const cos90 = 0;
  const sin90 = 1;
  const project = buildProject([
    {
      id: 'page-1',
      name: 'Test Page',
      children: [
        {
          id: 'rotated-frame',
          name: 'Rotated',
          type: 'frame',
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          fills: [],
          strokes: [],
          relativeTransform: [
            [cos90, -sin90, 0],
            [sin90, cos90, 0],
          ],
          children: [
            {
              id: 'inside-rotated',
              name: 'Child',
              type: 'rect',
              x: 50,
              y: 0,
              width: 20,
              height: 20,
              fills: [],
              strokes: [],
            },
          ],
        },
      ],
    },
  ]);

  const result = converter.convertKizukuToPenpotFile(project);
  const pageId = result.data.pages[0];
  const page = result.data['pages-index'][pageId];
  const child = page.objects['inside-rotated'];

  assertTrue('child in rotated frame exists', child);
  assert('child x transformed', child.x, 100);
  assert('child y transformed', child.y, 150);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
