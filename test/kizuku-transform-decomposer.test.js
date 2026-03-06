/**
 * Tests for Kizuku Transform Decomposer
 * Covers matrix normalization, decomposition, flip detection, position.
 */

const decomposer = require('../src/services/figma/kizuku-transform-decomposer');

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
 * Assert value is approximately equal (within tolerance)
 * @param {string} name - Test name
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} tol - Tolerance
 */
function assertApprox(name, actual, expected, tol) {
  const epsilon = tol || 0.01;
  if (Math.abs(actual - expected) < epsilon) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
    console.log(`    Expected: ~${expected}`);
    console.log(`    Got:      ${actual}`);
  }
}

/**
 * Run all transform decomposer tests
 */
function runTests() {
  console.log('\n--- Transform Decomposer Tests ---');
  testNormalizeMatrix();
  testIdentityDecompose();
  testRotationDecompose();
  testFlipHorizontal();
  testFlipVertical();
  testPosition();
  testNonTrivialDetection();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/** Test matrix normalization from various formats */
function testNormalizeMatrix() {
  const arr = decomposer.normalizeMatrix([[1, 0, 10], [0, 1, 20]]);
  assert('array a', arr.a, 1);
  assert('array e', arr.e, 10);
  assert('array f', arr.f, 20);

  const mnn = decomposer.normalizeMatrix({ m00: 2, m01: 0, m02: 5, m10: 0, m11: 3, m12: 7 });
  assert('mnn a', mnn.a, 2);
  assert('mnn d', mnn.d, 3);

  assert('null matrix', decomposer.normalizeMatrix(null), null);
}

/** Test identity matrix decomposes to no rotation/scale/flip */
function testIdentityDecompose() {
  const res = decomposer.decomposeAffineMatrix([[1, 0, 0], [0, 1, 0]]);
  assertApprox('identity rotation', res.rotation, 0);
  assertApprox('identity scaleX', res.scaleX, 1);
  assertApprox('identity scaleY', res.scaleY, 1);
  assert('identity flipH', res.flipH, false);
  assert('identity flipV', res.flipV, false);
}

/** Test 90-degree rotation decomposes correctly */
function testRotationDecompose() {
  const cos90 = 0;
  const sin90 = 1;
  const res = decomposer.decomposeAffineMatrix([
    [cos90, -sin90, 0],
    [sin90, cos90, 0],
  ]);
  assertApprox('90deg rotation', res.rotation, 90);
  assert('90deg no flipH', res.flipH, false);
  assert('90deg no flipV', res.flipV, false);
}

/** Test horizontal flip detection (negative determinant) */
function testFlipHorizontal() {
  const res = decomposer.decomposeAffineMatrix([[-1, 0, 0], [0, 1, 0]]);
  assert('flipH detected', res.flipH, true);
  assert('flipH no flipV', res.flipV, false);
}

/** Test vertical flip detection (positive det, negative scaleY) */
function testFlipVertical() {
  const res = decomposer.decomposeAffineMatrix([[1, 0, 0], [0, -1, 0]]);
  assert('flipV detected', res.flipV, true);
  assert('flipV no flipH', res.flipH, false);
  assertApprox('flipV scaleY positive', res.scaleY, 1);
}

/** Test position extraction from various formats */
function testPosition() {
  const arr = decomposer.extractPosition([[1, 0, 50], [0, 1, 75]]);
  assert('array pos x', arr.x, 50);
  assert('array pos y', arr.y, 75);

  const mnn = decomposer.extractPosition({ m02: 100, m12: 200 });
  assert('mnn pos x', mnn.x, 100);

  const txty = decomposer.extractPosition({ tx: 30, ty: 40 });
  assert('tx pos x', txty.x, 30);

  const nil = decomposer.extractPosition(null);
  assert('null pos', nil.x, 0);
}

/** Test non-trivial transform detection */
function testNonTrivialDetection() {
  assert('identity trivial', decomposer.hasNonTrivialTransform([[1, 0, 0], [0, 1, 0]]), false);
  assert('translated trivial', decomposer.hasNonTrivialTransform([[1, 0, 50], [0, 1, 50]]), false);
  assert('rotated non-trivial', decomposer.hasNonTrivialTransform([[0, -1, 0], [1, 0, 0]]), true);
  assert('scaled non-trivial', decomposer.hasNonTrivialTransform([[2, 0, 0], [0, 1, 0]]), true);
  assert('null trivial', decomposer.hasNonTrivialTransform(null), false);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
