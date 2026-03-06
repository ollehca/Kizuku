/**
 * Tests for fig-node-properties
 * Covers binary paint conversion including new property extraction.
 */

const props = require('../src/services/figma/fig-node-properties');

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
 * Run all fig-node-properties tests
 */
function runTests() {
  console.log('\n--- Fig Node Properties Tests ---');
  testConvertPaintsBasic();
  testConvertPaintsExtendedProps();
  testCopyHelpers();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/** Test basic paint conversion */
function testConvertPaintsBasic() {
  const paints = props.convertPaints([
    { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.8 },
  ]);
  assert('basic paint type', paints[0].type, 'SOLID');
  assert('basic paint opacity', paints[0].opacity, 0.8);
  assertTrue('basic paint color', paints[0].color);

  const empty = props.convertPaints(null);
  assert('null paints', empty, []);

  const emptyArr = props.convertPaints([]);
  assert('empty array paints', emptyArr, []);
}

/** Test that extended properties are extracted from binary paints */
function testConvertPaintsExtendedProps() {
  const paints = props.convertPaints([
    {
      type: 'IMAGE',
      opacity: 1,
      imageRef: 'img-abc',
      blendMode: 'MULTIPLY',
      imageTransform: [[0.5, 0, 0.1], [0, 0.75, 0.2]],
      tileOffsetX: 10,
      tileOffsetY: 20,
      scalingFactor: 0.5,
    },
  ]);
  assert('extended blendMode', paints[0].blendMode, 'MULTIPLY');
  assertTrue('extended imageTransform', paints[0].imageTransform);
  assert('extended tileOffsetX', paints[0].tileOffsetX, 10);
  assert('extended tileOffsetY', paints[0].tileOffsetY, 20);
  assert('extended scalingFactor', paints[0].scalingFactor, 0.5);

  const noExtended = props.convertPaints([
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 },
  ]);
  assert('no blendMode', noExtended[0].blendMode, undefined);
  assert('no tileOffsetX', noExtended[0].tileOffsetX, undefined);
}

/** Test copy helper utilities */
function testCopyHelpers() {
  const target = {};
  props.copyIfDefined(target, { key: 42 }, 'key');
  assert('copyIfDefined copies', target.key, 42);

  const target2 = {};
  props.copyIfDefined(target2, { key: undefined }, 'key');
  assert('copyIfDefined skips undefined', target2.key, undefined);

  const target3 = {};
  props.copyIfPresent(target3, { obj: { nested: true } }, 'obj');
  assertTrue('copyIfPresent copies object', target3.obj);

  const target4 = {};
  props.copyIfPresent(target4, { obj: null }, 'obj');
  assert('copyIfPresent skips null', target4.obj, undefined);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
