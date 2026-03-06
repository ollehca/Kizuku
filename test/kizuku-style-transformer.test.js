/**
 * Tests for Kizuku Style Transformer
 * Covers fills (solid, gradient, image), strokes, effects, blend modes.
 */

const styles = require('../src/services/figma/kizuku-style-transformer');

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
 * Run all style transformer tests
 */
function runTests() {
  console.log('\n--- Style Transformer Tests ---');
  testTransformColor();
  testSolidFills();
  testGradientFills();
  testImageFills();
  testStrokes();
  testEffects();
  testEffectHiddenFlag();
  testIndividualStrokeWeights();
  testBlendModes();
  testPerFillBlendMode();
  testPatternFills();
  testStrokeMiterLimit();
  testTilingProps();
  testShadowEffectOpacity();
  testGradientPositions();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test color transformation
 */
function testTransformColor() {
  assert('black color', styles.transformColor({ r: 0, g: 0, b: 0 }), '#000000');
  assert('white color', styles.transformColor({ r: 1, g: 1, b: 1 }), '#ffffff');
  assert('red color', styles.transformColor({ r: 1, g: 0, b: 0 }), '#ff0000');
  assert('null color', styles.transformColor(null), '#000000');
  assert('alpha color', styles.transformColor({ r: 1, g: 0, b: 0, a: 0.5 }), 'rgba(255, 0, 0, 0.5)');
}

/**
 * Test solid fill transformation
 */
function testSolidFills() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.8 }],
    warn,
    unsupported
  );
  assert('solid fill type', fills[0].type, 'color');
  assert('solid fill color', fills[0].color, '#ff0000');
  assert('solid fill opacity', fills[0].opacity, 0.8);
  assert('empty fills', styles.transformFills(null, warn, unsupported), []);
  assert('hidden fills filtered', styles.transformFills(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false }],
    warn, unsupported
  ), []);
}

/**
 * Test gradient fill transformation
 */
function testGradientFills() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [[1, 0, 0], [0, 1, 0]],
    }],
    warn, unsupported
  );
  assert('gradient fill type', fills[0].type, 'gradient');
  assert('gradient stops count', fills[0].gradient.stops.length, 2);
  assert('gradient type', fills[0].gradient.type, 'linear');
}

/**
 * Test image fill transformation
 */
function testImageFills() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{ type: 'IMAGE', imageRef: 'img-123', scaleMode: 'FIT', opacity: 0.9 }],
    warn, unsupported
  );
  assert('image fill type', fills[0].type, 'image');
  assert('image fill ref', fills[0].imageRef, 'img-123');
  assert('image fill scale', fills[0].scaleMode, 'FIT');
  assert('image fill opacity', fills[0].opacity, 0.9);
}

/**
 * Test stroke transformation
 */
function testStrokes() {
  const strokes = styles.transformStrokes(
    [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 1 }],
    { strokeWeight: 3, strokeAlign: 'INSIDE', dashPattern: [5, 3], strokeCap: 'ROUND' }
  );
  assert('stroke color', strokes[0].color, '#00ff00');
  assert('stroke width', strokes[0].width, 3);
  assert('stroke alignment', strokes[0].alignment, 'inner');
  assert('stroke style', strokes[0].style, 'dashed');
  assert('stroke cap', strokes[0].capStart, 'round');
  assert('empty strokes', styles.transformStrokes(null, {}), []);
}

/**
 * Test effect transformation
 */
function testEffects() {
  const warn = () => {};
  const effects = styles.transformEffects(
    [
      {
        type: 'DROP_SHADOW',
        visible: true,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 2, y: 4 },
        radius: 8,
        spread: 1,
      },
      { type: 'LAYER_BLUR', visible: true, radius: 5 },
    ],
    warn
  );
  assert('shadow type', effects[0].type, 'drop-shadow');
  assert('shadow blur', effects[0].blur, 8);
  assert('shadow spread', effects[0].spread, 1);
  assert('blur type', effects[1].type, 'blur');
  assert('blur value', effects[1].value, 5);
}

/**
 * Test effects with visible: false get hidden flag instead of being filtered
 */
function testEffectHiddenFlag() {
  const warn = () => {};
  const effects = styles.transformEffects(
    [
      {
        type: 'DROP_SHADOW',
        visible: false,
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 2, y: 4 },
        radius: 8,
        spread: 1,
      },
      { type: 'LAYER_BLUR', visible: false, radius: 5 },
      {
        type: 'INNER_SHADOW',
        visible: true,
        color: { r: 0, g: 0, b: 0, a: 1 },
        offset: { x: 0, y: 2 },
        radius: 4,
        spread: 0,
      },
    ],
    warn
  );
  assert('hidden effects preserved count', effects.length, 3);
  assert('hidden shadow preserved', effects[0].type, 'drop-shadow');
  assert('hidden shadow flag', effects[0].hidden, true);
  assert('hidden blur preserved', effects[1].type, 'blur');
  assert('hidden blur flag', effects[1].hidden, true);
  assert('visible effect not hidden', effects[2].hidden, false);
}

/**
 * Test individual per-side stroke weights attached to stroke
 */
function testIndividualStrokeWeights() {
  const strokes = styles.transformStrokes(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
    {
      strokeWeight: 1,
      strokeAlign: 'CENTER',
      individualStrokeWeights: {
        top: 2,
        right: 4,
        bottom: 6,
        left: 8,
      },
    }
  );
  assert('individual weights top', strokes[0].individualWeights.top, 2);
  assert('individual weights right', strokes[0].individualWeights.right, 4);
  assert('individual weights bottom', strokes[0].individualWeights.bottom, 6);
  assert('individual weights left', strokes[0].individualWeights.left, 8);
  assert('width from max individual', strokes[0].width, 8);

  const noIndividual = styles.transformStrokes(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
    { strokeWeight: 5, strokeAlign: 'CENTER' }
  );
  assert('no individual weights', noIndividual[0].individualWeights, undefined);
}

/**
 * Test blend mode transformation
 */
function testBlendModes() {
  const warn = () => {};
  const unsupported = new Set();
  assert('normal', styles.transformBlendMode('NORMAL', warn, unsupported), 'normal');
  assert('multiply', styles.transformBlendMode('MULTIPLY', warn, unsupported), 'multiply');
  assert('pass through', styles.transformBlendMode('PASS_THROUGH', warn, unsupported), 'normal');
  assert('overlay', styles.transformBlendMode('OVERLAY', warn, unsupported), 'overlay');
}

/**
 * Test per-fill blend mode passthrough
 */
function testPerFillBlendMode() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1, blendMode: 'MULTIPLY' }],
    warn,
    unsupported
  );
  assert('per-fill blend mode', fills[0].blendMode, 'multiply');

  const noBlend = styles.transformFills(
    [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 1 }],
    warn,
    unsupported
  );
  assert('no blend mode', noBlend[0].blendMode, undefined);
}

/**
 * Test PATTERN fill type conversion
 */
function testPatternFills() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{ type: 'PATTERN', imageRef: 'pat-123', opacity: 0.8, scalingFactor: 2 }],
    warn,
    unsupported
  );
  assert('pattern fill type', fills[0].type, 'image');
  assert('pattern scale mode', fills[0].scaleMode, 'TILE');
  assert('pattern tile scale', fills[0].tileScale, 2);
  assert('pattern image ref', fills[0].imageRef, 'pat-123');
}

/**
 * Test stroke miter limit passthrough
 */
function testStrokeMiterLimit() {
  const strokes = styles.transformStrokes(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
    { strokeWeight: 2, strokeAlign: 'CENTER', strokeMiterAngle: 8 }
  );
  assert('miter limit', strokes[0].miterLimit, 8);

  const noMiter = styles.transformStrokes(
    [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
    { strokeWeight: 2, strokeAlign: 'CENTER' }
  );
  assert('no miter limit', noMiter[0].miterLimit, undefined);
}

/**
 * Test image fill tiling properties passthrough
 */
function testTilingProps() {
  const warn = () => {};
  const unsupported = new Set();
  const fills = styles.transformFills(
    [{
      type: 'IMAGE',
      imageRef: 'tile-img',
      scaleMode: 'TILE',
      opacity: 1,
      scalingFactor: 0.5,
      tileOffsetX: 10,
      tileOffsetY: 20,
    }],
    warn,
    unsupported
  );
  assert('tile scale', fills[0].tileScale, 0.5);
  assert('tile offset x', fills[0].tileOffsetX, 10);
  assert('tile offset y', fills[0].tileOffsetY, 20);
}

/**
 * Test shadow effect carries color alpha and effect opacity through
 */
function testShadowEffectOpacity() {
  const warn = () => {};
  const effects = styles.transformEffects(
    [{
      type: 'DROP_SHADOW',
      visible: true,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
      offset: { x: 0, y: 2 },
      radius: 4,
      spread: 0,
      opacity: 0.8,
    }],
    warn
  );
  assert('shadow opacity combined', effects[0].opacity, 0.4);

  const noEffectOpacity = styles.transformEffects(
    [{
      type: 'DROP_SHADOW',
      visible: true,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
      offset: { x: 0, y: 2 },
      radius: 4,
      spread: 0,
    }],
    warn
  );
  assert('shadow opacity from alpha only', noEffectOpacity[0].opacity, 0.5);
}

/**
 * Test gradient position extraction from affine transform matrix
 */
function testGradientPositions() {
  const warn = () => {};
  const unsupported = new Set();

  const identity = styles.transformFills(
    [{
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [[1, 0, 0], [0, 1, 0]],
    }],
    warn, unsupported
  );
  const grad = identity[0].gradient;
  assert('identity startX', grad.startX, 0);
  assert('identity startY', grad.startY, 0.5);
  assert('identity endX', grad.endX, 1);
  assert('identity endY', grad.endY, 0.5);

  const rotated = styles.transformFills(
    [{
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [[0, -1, 1], [1, 0, 0]],
    }],
    warn, unsupported
  );
  const rGrad = rotated[0].gradient;
  assert('rotated startX', rGrad.startX, 0.5);
  assert('rotated startY', rGrad.startY, 0);
  assert('rotated endX', rGrad.endX, 0.5);
  assert('rotated endY', rGrad.endY, 1);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
