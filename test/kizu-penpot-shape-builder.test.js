/**
 * Tests for Kizu PenPot Shape Builder
 * Covers all PenPot property conversions: fills, strokes, effects,
 * paths, corners, constraints, layout, display props.
 */

const shapes = require('../src/services/kizu-penpot-shape-builder');

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
 * Run all shape builder tests
 */
function runTests() {
  console.log('\n--- PenPot Shape Builder Tests ---');
  testSolidFills();
  testGradientFills();
  testImageFills();
  testLegacyFills();
  testStrokes();
  testEffects();
  testPathSegments();
  testCornerRadius();
  testConstraints();
  testLayoutConversion();
  testLayoutChildConversion();
  testDisplayProps();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test solid fill conversion
 */
function testSolidFills() {
  const fills = shapes.convertFillsToPenpot([
    { type: 'color', color: '#ff0000', opacity: 0.8 },
  ]);
  assert('solid fill color', fills[0]['fill-color'], '#ff0000');
  assert('solid fill opacity', fills[0]['fill-opacity'], 0.8);
  assert('empty fills', shapes.convertFillsToPenpot(null), []);
}

/**
 * Test gradient fill conversion
 */
function testGradientFills() {
  const fills = shapes.convertFillsToPenpot([
    {
      type: 'gradient',
      opacity: 1,
      gradient: {
        type: 'linear',
        startX: 0, startY: 0, endX: 1, endY: 1,
        width: 1,
        stops: [{ position: 0, color: '#ff0000' }, { position: 1, color: '#0000ff' }],
      },
    },
  ]);
  assertTrue('gradient fill', fills[0]['fill-color-gradient']);
  assert('gradient type', fills[0]['fill-color-gradient'].type, 'linear');
  assert('gradient stops', fills[0]['fill-color-gradient'].stops.length, 2);
}

/**
 * Test image fill conversion
 */
function testImageFills() {
  const fills = shapes.convertFillsToPenpot([
    { type: 'image', imageRef: 'img-123', scaleMode: 'FIT', opacity: 0.9 },
  ]);
  assertTrue('image fill', fills[0]['fill-image']);
  assert('image id', fills[0]['fill-image'].id, 'img-123');
  assert('image scale', fills[0]['fill-image']['scale-mode'], 'fit');
}

/**
 * Test legacy fill format passthrough
 */
function testLegacyFills() {
  const fills = shapes.convertFillsToPenpot([
    { color: '#00ff00', opacity: 1 },
  ]);
  assert('legacy color', fills[0]['fill-color'], '#00ff00');

  const passthrough = shapes.convertFillsToPenpot([
    { 'fill-color': '#0000ff', 'fill-opacity': 1 },
  ]);
  assert('passthrough color', passthrough[0]['fill-color'], '#0000ff');
}

/**
 * Test stroke conversion
 */
function testStrokes() {
  const strokes = shapes.convertStrokesToPenpot([
    { color: '#ff0000', opacity: 1, width: 2, alignment: 'inner', style: 'dashed', capStart: 'round' },
  ]);
  assert('stroke color', strokes[0]['stroke-color'], '#ff0000');
  assert('stroke width', strokes[0]['stroke-width'], 2);
  assert('stroke alignment', strokes[0]['stroke-alignment'], 'inner');
  assert('stroke style', strokes[0]['stroke-style'], 'dashed');
  assert('stroke cap', strokes[0]['stroke-cap-start'], 'round');
  assert('empty strokes', shapes.convertStrokesToPenpot(null), []);
}

/**
 * Test effect conversion
 */
function testEffects() {
  const { shadow, blur } = shapes.convertEffectsToPenpot([
    { type: 'drop-shadow', color: '#000000', offsetX: 2, offsetY: 4, blur: 8, spread: 1 },
    { type: 'blur', value: 5 },
  ]);
  assert('shadow count', shadow.length, 1);
  assert('shadow blur', shadow[0].blur, 8);
  assert('shadow spread', shadow[0].spread, 1);
  assertTrue('blur exists', blur);
  assert('blur type', blur.type, 'layer-blur');
  assert('blur value', blur.value, 5);

  const empty = shapes.convertEffectsToPenpot(null);
  assert('empty shadow', empty.shadow, []);
  assert('empty blur', empty.blur, null);
}

/**
 * Test path segment conversion
 */
function testPathSegments() {
  const segments = shapes.convertPathSegments([
    { command: 'M', x: 0, y: 0 },
    { command: 'L', x: 100, y: 0 },
    { command: 'C', x1: 10, y1: 20, x2: 30, y2: 40, x: 50, y: 60 },
    { command: 'Z' },
  ]);
  assert('move-to', segments[0].type, 'move-to');
  assert('line-to', segments[1].type, 'line-to');
  assert('curve-to', segments[2].type, 'curve-to');
  assert('curve c1x', segments[2].params.c1x, 10);
  assert('close-path', segments[3].type, 'close-path');
  assert('empty segments', shapes.convertPathSegments(null), []);
}

/**
 * Test corner radius conversion
 */
function testCornerRadius() {
  const uniform = shapes.convertCornerRadius({ cornerRadius: 8 });
  assert('uniform r1', uniform.r1, 8);
  assert('uniform r4', uniform.r4, 8);

  const perCorner = shapes.convertCornerRadius({
    cornerRadii: { topLeft: 4, topRight: 8, bottomRight: 12, bottomLeft: 16 },
  });
  assert('per-corner r1', perCorner.r1, 4);
  assert('per-corner r2', perCorner.r2, 8);
  assert('per-corner r3', perCorner.r3, 12);
  assert('per-corner r4', perCorner.r4, 16);
}

/**
 * Test constraint conversion
 */
function testConstraints() {
  const result = shapes.convertConstraints({ horizontal: 'MAX', vertical: 'STRETCH' });
  assert('h constraint', result['constraints-h'], 'right');
  assert('v constraint', result['constraints-v'], 'topbottom');

  const defaults = shapes.convertConstraints(null);
  assert('default h', defaults['constraints-h'], 'left');
  assert('default v', defaults['constraints-v'], 'top');
}

/**
 * Test layout conversion to PenPot
 */
function testLayoutConversion() {
  const result = shapes.convertLayoutToPenpot({
    layout: 'flex',
    layoutFlexDir: 'column',
    layoutGap: { rowGap: 10, columnGap: 10 },
    layoutPadding: { p1: 8, p2: 8, p3: 8, p4: 8 },
    layoutJustifyContent: 'center',
    layoutAlignItems: 'end',
    layoutWrapType: 'wrap',
  });
  assert('layout type', result.layout, 'flex');
  assert('flex dir', result['layout-flex-dir'], 'column');
  assert('justify', result['layout-justify-content'], 'center');

  assert('null layout', shapes.convertLayoutToPenpot(null), {});
}

/**
 * Test layout child conversion to PenPot
 */
function testLayoutChildConversion() {
  const result = shapes.convertLayoutChildToPenpot({
    layoutItemHSizing: 'fill',
    layoutItemVSizing: 'auto',
    layoutItemMinW: 100,
    layoutItemAbsolute: true,
  });
  assert('h sizing', result['layout-item-h-sizing'], 'fill');
  assert('v sizing', result['layout-item-v-sizing'], 'auto');
  assert('min-w', result['layout-item-min-w'], 100);
  assert('absolute', result['layout-item-absolute'], true);

  assert('null child', shapes.convertLayoutChildToPenpot(null), {});
}

/**
 * Test display property extraction
 */
function testDisplayProps() {
  const result = shapes.extractDisplayProps({
    visible: true,
    opacity: 0.5,
    rotation: 45,
    blendMode: 'multiply',
    locked: true,
    hidden: false,
  });
  assert('visible', result.visible, true);
  assert('opacity', result.opacity, 0.5);
  assert('rotation', result.rotation, 45);
  assert('blend-mode', result['blend-mode'], 'multiply');
  assert('locked', result.locked, true);

  const hidden = shapes.extractDisplayProps({ hidden: true, visible: true });
  assert('hidden overrides visible', hidden.visible, false);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
