/**
 * Tests for Kizuku Layout Transformer
 * Covers flex layout mapping, child sizing, wrap, absolute positioning.
 */

const layout = require('../src/services/figma/kizuku-layout-transformer');

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
 * Run all layout transformer tests
 */
function runTests() {
  console.log('\n--- Layout Transformer Tests ---');
  testMappers();
  testTransformLayout();
  testTransformLayoutChild();
  testHasLayout();
  testNoLayout();
  testContainerMinMax();
  testGridCellsUseConvertedIds();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test mapping helper functions
 */
function testMappers() {
  assert('justify MIN', layout.mapJustifyContent('MIN'), 'start');
  assert('justify CENTER', layout.mapJustifyContent('CENTER'), 'center');
  assert('justify SPACE_BETWEEN', layout.mapJustifyContent('SPACE_BETWEEN'), 'space-between');
  assert('align MIN', layout.mapAlignItems('MIN'), 'start');
  assert('align MAX', layout.mapAlignItems('MAX'), 'end');
  assert('sizing FIXED', layout.mapItemSizing('FIXED'), 'fix');
  assert('sizing HUG', layout.mapItemSizing('HUG'), 'auto');
  assert('sizing FILL', layout.mapItemSizing('FILL'), 'fill');
  assert('wrap WRAP', layout.mapWrapType('WRAP'), 'wrap');
  assert('wrap NONE', layout.mapWrapType('NO_WRAP'), 'nowrap');
}

/**
 * Test full layout transformation
 */
function testTransformLayout() {
  const node = {
    layoutMode: 'HORIZONTAL',
    itemSpacing: 16,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'MAX',
    layoutWrap: 'WRAP',
  };
  const result = layout.transformLayout(node);
  assert('layout type', result.layout, 'flex');
  assert('flex dir', result.layoutFlexDir, 'row');
  assert('gap column', result.layoutGap.columnGap, 16);
  assert('padding top', result.layoutPadding.p1, 8);
  assert('padding right', result.layoutPadding.p2, 12);
  assert('justify content', result.layoutJustifyContent, 'center');
  assert('align items', result.layoutAlignItems, 'end');
  assert('wrap type', result.layoutWrapType, 'wrap');
}

/**
 * Test layout child sizing
 */
function testTransformLayoutChild() {
  const node = {
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    minWidth: 100,
    maxWidth: 500,
    layoutPositioning: 'ABSOLUTE',
    layoutGrow: 1,
  };
  const result = layout.transformLayoutChild(node);
  assert('h sizing', result.layoutItemHSizing, 'fill');
  assert('v sizing', result.layoutItemVSizing, 'auto');
  assert('min width', result.layoutItemMinW, 100);
  assert('max width', result.layoutItemMaxW, 500);
  assert('absolute', result.layoutItemAbsolute, true);
  assert('grow', result.layoutItemGrow, 1);
}

/**
 * Test hasLayout helper
 */
function testHasLayout() {
  assert('has horizontal', layout.hasLayout({ layoutMode: 'HORIZONTAL' }), true);
  assert('has vertical', layout.hasLayout({ layoutMode: 'VERTICAL' }), true);
  assert('no layout NONE', layout.hasLayout({ layoutMode: 'NONE' }), false);
  assert('no layout null', !!layout.hasLayout({}), false);
}

/**
 * Test null layout returns null
 */
function testNoLayout() {
  assert('no layout mode', layout.transformLayout({}), null);
  assert('layout NONE', layout.transformLayout({ layoutMode: 'NONE' }), null);
}

/**
 * Test container min/max width/height attached to layout result
 */
function testContainerMinMax() {
  const node = {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    minWidth: 200,
    maxWidth: 800,
    minHeight: 100,
    maxHeight: 600,
  };
  const result = layout.transformLayout(node);
  assert('container minW', result.layoutContainerMinW, 200);
  assert('container maxW', result.layoutContainerMaxW, 800);
  assert('container minH', result.layoutContainerMinH, 100);
  assert('container maxH', result.layoutContainerMaxH, 600);

  const noMinMax = layout.transformLayout({
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  });
  assert('no container minW', noMinMax.layoutContainerMinW, undefined);
  assert('no container maxW', noMinMax.layoutContainerMaxW, undefined);
}

/**
 * Test that grid cells reference converted children IDs, not raw Figma IDs
 */
function testGridCellsUseConvertedIds() {
  const tableNode = { numRows: 1, numColumns: 2 };
  const convertedChildren = [
    { id: 'uuid-aaa-111', name: 'Cell 1' },
    { id: 'uuid-bbb-222', name: 'Cell 2' },
  ];
  const result = layout.transformGridLayout(tableNode, convertedChildren);
  const cells = Object.values(result.layoutGridCells);
  assert('grid cell count', cells.length, 2);
  assert('cell 1 shape ref', cells[0].shapes[0], 'uuid-aaa-111');
  assert('cell 2 shape ref', cells[1].shapes[0], 'uuid-bbb-222');
  assert('cell ids are UUIDs', cells[0].id.includes('-'), true);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
