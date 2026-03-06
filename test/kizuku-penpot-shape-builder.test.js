/**
 * Tests for Kizuku PenPot Shape Builder
 * Covers all PenPot property conversions: fills, strokes, effects,
 * paths, corners, constraints, layout, display props.
 */

const shapes = require('../src/services/kizuku-penpot-shape-builder');
const imageBuilder = require('../src/services/kizuku-penpot-image-builder');

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
  testShadowHiddenFlag();
  testImageTransform();
  testGridLayout();
  testPathSegments();
  testCornerRadius();
  testConstraints();
  testLayoutConversion();
  testLayoutChildConversion();
  testDisplayProps();
  testPerFillBlendMode();
  testStrokeMiterLimit();
  testTilingOutput();
  testShadowOpacity();
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
 * Test shadow hidden flag passthrough in convertShadowEffect
 */
function testShadowHiddenFlag() {
  const { shadow } = shapes.convertEffectsToPenpot([
    {
      type: 'drop-shadow',
      color: '#000000',
      offsetX: 2,
      offsetY: 4,
      blur: 8,
      spread: 0,
      hidden: true,
    },
    {
      type: 'inner-shadow',
      color: '#ff0000',
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      spread: 0,
      hidden: false,
    },
  ]);
  assert('hidden shadow flag', shadow[0].hidden, true);
  assert('visible shadow flag', shadow[1].hidden, false);

  const { blur } = shapes.convertEffectsToPenpot([
    { type: 'blur', value: 5, hidden: true },
  ]);
  assert('hidden blur flag', blur.hidden, true);
}

/**
 * Test image fill with imageTransform matrix attached
 */
function testImageTransform() {
  imageBuilder.setImageAssets([]);
  const fills = shapes.convertFillsToPenpot([
    {
      type: 'image',
      imageRef: 'img-transform',
      scaleMode: 'CROP',
      opacity: 1,
      imageTransform: [[0.5, 0, 0.1], [0, 0.75, 0.2]],
    },
  ]);
  assertTrue('image fill present', fills[0]['fill-image']);
  assertTrue('image transform present', fills[0]['fill-image-transform']);
  assert('transform scaleX', fills[0]['fill-image-transform'].scaleX, 0.5);
  assert('transform scaleY', fills[0]['fill-image-transform'].scaleY, 0.75);
  assert('transform offsetX', fills[0]['fill-image-transform'].offsetX, 0.1);
  assert('transform offsetY', fills[0]['fill-image-transform'].offsetY, 0.2);

  const noTransform = shapes.convertFillsToPenpot([
    { type: 'image', imageRef: 'img-plain', opacity: 1 },
  ]);
  assert('no transform key', noTransform[0]['fill-image-transform'], undefined);
}

/**
 * Test grid layout conversion to PenPot format
 */
function testGridLayout() {
  const gridResult = shapes.convertLayoutToPenpot({
    layout: 'grid',
    layoutGridDir: 'row',
    layoutGridRows: [{ type: 'flex', value: 1 }, { type: 'flex', value: 1 }],
    layoutGridColumns: [{ type: 'flex', value: 1 }, { type: 'flex', value: 1 }],
    layoutGridCells: { 'cell-1': { id: 'cell-1', row: 1, column: 1 } },
    layoutGap: { rowGap: 4, columnGap: 8 },
    layoutPadding: { p1: 10, p2: 10, p3: 10, p4: 10 },
  });
  assert('grid layout type', gridResult.layout, 'grid');
  assert('grid dir', gridResult['layout-grid-dir'], 'row');
  assert('grid rows count', gridResult['layout-grid-rows'].length, 2);
  assert('grid cols count', gridResult['layout-grid-columns'].length, 2);
  assertTrue('grid cells present', gridResult['layout-grid-cells']['cell-1']);
  assert('grid gap row', gridResult['layout-gap'].rowGap, 4);
  assert('grid padding p1', gridResult['layout-padding'].p1, 10);
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
  assert('move-to', segments[0].command, 'move-to');
  assert('line-to', segments[1].command, 'line-to');
  assert('curve-to', segments[2].command, 'curve-to');
  assert('curve c1x', segments[2].params.c1x, 10);
  assert('close-path', segments[3].command, 'close-path');
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

  const withShrink = shapes.convertLayoutChildToPenpot({
    layoutItemHSizing: 'fix',
    layoutItemVSizing: 'fix',
    layoutItemShrink: 0,
  });
  assert('shrink factor', withShrink['layout-item-shrink'], 0);
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

/**
 * Test per-fill blend mode passthrough to PenPot fills
 */
function testPerFillBlendMode() {
  const fills = shapes.convertFillsToPenpot([
    { type: 'color', color: '#ff0000', opacity: 1, blendMode: 'multiply' },
    { type: 'color', color: '#00ff00', opacity: 1 },
  ]);
  assert('fill blend mode', fills[0]['fill-blend-mode'], 'multiply');
  assert('no blend mode', fills[1]['fill-blend-mode'], undefined);
}

/**
 * Test stroke miter limit passthrough
 */
function testStrokeMiterLimit() {
  const strokes = shapes.convertStrokesToPenpot([
    {
      color: '#ff0000',
      opacity: 1,
      width: 2,
      alignment: 'center',
      style: 'solid',
      join: 'miter',
      miterLimit: 10,
    },
  ]);
  assert('miter limit', strokes[0]['stroke-miter-limit'], 10);
  assert('stroke join', strokes[0]['stroke-join'], 'miter');
}

/**
 * Test tiling properties passthrough to PenPot image fill
 */
function testTilingOutput() {
  imageBuilder.setImageAssets([]);
  const fills = shapes.convertFillsToPenpot([
    {
      type: 'image',
      imageRef: 'tile-img',
      scaleMode: 'TILE',
      opacity: 1,
      tileScale: 0.5,
      tileOffsetX: 10,
      tileOffsetY: 20,
    },
  ]);
  assert('tile scale output', fills[0]['fill-image-tile-scale'], 0.5);
  assert('tile offset x output', fills[0]['fill-image-tile-offset-x'], 10);
  assert('tile offset y output', fills[0]['fill-image-tile-offset-y'], 20);
}

/**
 * Test shadow opacity is correctly passed through to PenPot format
 */
function testShadowOpacity() {
  const { shadow } = shapes.convertEffectsToPenpot([
    {
      type: 'drop-shadow',
      color: '#ff0000',
      opacity: 0.4,
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      spread: 0,
    },
  ]);
  assert('shadow opacity from effect', shadow[0].color.opacity, 0.4);

  const { shadow: noOpacity } = shapes.convertEffectsToPenpot([
    {
      type: 'drop-shadow',
      color: 'rgba(255, 0, 0, 0.7)',
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      spread: 0,
    },
  ]);
  assert('shadow opacity from rgba', noOpacity[0].color.opacity, 0.7);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
