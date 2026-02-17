/**
 * Tests for Kizu Path Generator
 * Covers SVG path parsing including H/V/S/T/A, relative commands,
 * multi-path geometry, star/polygon generation.
 */

const pathGen = require('../src/services/figma/kizu-path-generator');

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
 * Run all path generator tests
 */
function runTests() {
  console.log('\n--- Path Generator Tests ---');
  testBasicCommands();
  testHorizontalVertical();
  testCubicBezier();
  testSmoothCubic();
  testQuadratic();
  testArcCommand();
  testRelativeCommands();
  testCloseCommand();
  testStarGeneration();
  testPolygonGeneration();
  testVectorGeometry();
  testMultiGeometry();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test basic M and L commands
 */
function testBasicCommands() {
  const cmds = pathGen.parseSvgPathString('M 10 20 L 30 40');
  assert('move command', cmds[0].command, 'M');
  assert('move x', cmds[0].x, 10);
  assert('move y', cmds[0].y, 20);
  assert('line command', cmds[1].command, 'L');
  assert('line x', cmds[1].x, 30);
  assert('empty string', pathGen.parseSvgPathString(''), []);
  assert('null input', pathGen.parseSvgPathString(null), []);
}

/**
 * Test H and V commands (converted to L)
 */
function testHorizontalVertical() {
  const cmds = pathGen.parseSvgPathString('M 0 0 H 100 V 50');
  assert('H becomes L', cmds[1].command, 'L');
  assert('H x value', cmds[1].x, 100);
  assert('H y stays 0', cmds[1].y, 0);
  assert('V becomes L', cmds[2].command, 'L');
  assert('V x stays 100', cmds[2].x, 100);
  assert('V y value', cmds[2].y, 50);
}

/**
 * Test cubic bezier commands
 */
function testCubicBezier() {
  const cmds = pathGen.parseSvgPathString('M 0 0 C 10 20 30 40 50 60');
  assert('cubic command', cmds[1].command, 'C');
  assert('cubic x1', cmds[1].x1, 10);
  assert('cubic y1', cmds[1].y1, 20);
  assert('cubic x', cmds[1].x, 50);
  assert('cubic y', cmds[1].y, 60);
}

/**
 * Test smooth cubic (S) command
 */
function testSmoothCubic() {
  const cmds = pathGen.parseSvgPathString('M 0 0 C 10 10 20 20 30 30 S 50 50 60 60');
  assert('smooth becomes C', cmds[2].command, 'C');
  assertTrue('smooth cubic has x1', cmds[2].x1 !== undefined);
  assert('smooth end x', cmds[2].x, 60);
}

/**
 * Test quadratic bezier (Q → C approximation)
 */
function testQuadratic() {
  const cmds = pathGen.parseSvgPathString('M 0 0 Q 50 50 100 0');
  assert('quad becomes C', cmds[1].command, 'C');
  assert('quad end x', cmds[1].x, 100);
  assert('quad end y', cmds[1].y, 0);
}

/**
 * Test arc (A) command → cubic bezier
 */
function testArcCommand() {
  const cmds = pathGen.parseSvgPathString('M 0 0 A 50 50 0 0 1 100 0');
  assertTrue('arc produces curves', cmds.length > 1);
  assert('arc curve type', cmds[1].command, 'C');
}

/**
 * Test relative (lowercase) commands
 */
function testRelativeCommands() {
  const cmds = pathGen.parseSvgPathString('M 10 10 l 20 30');
  assert('relative L command', cmds[1].command, 'L');
  assert('relative L x abs', cmds[1].x, 30);
  assert('relative L y abs', cmds[1].y, 40);

  const hv = pathGen.parseSvgPathString('M 10 20 h 50 v 30');
  assert('relative H x', hv[1].x, 60);
  assert('relative H y', hv[1].y, 20);
  assert('relative V x', hv[2].x, 60);
  assert('relative V y', hv[2].y, 50);
}

/**
 * Test close path command
 */
function testCloseCommand() {
  const cmds = pathGen.parseSvgPathString('M 0 0 L 100 0 L 100 100 Z');
  assert('close command', cmds[3].command, 'Z');
}

/**
 * Test star path generation
 */
function testStarGeneration() {
  const cmds = pathGen.generateStarPath(100, 100, 5, 0.38);
  assertTrue('star has commands', cmds.length > 0);
  assert('star starts with M', cmds[0].command, 'M');
  assert('star ends with Z', cmds[cmds.length - 1].command, 'Z');
  assert('star point count', cmds.length - 1, 10);
}

/**
 * Test polygon path generation
 */
function testPolygonGeneration() {
  const cmds = pathGen.generatePolygonPath(100, 100, 6);
  assertTrue('hex has commands', cmds.length > 0);
  assert('hex starts with M', cmds[0].command, 'M');
  assert('hex ends with Z', cmds[cmds.length - 1].command, 'Z');
  assert('hex side count', cmds.length - 1, 6);
}

/**
 * Test vector geometry parsing
 */
function testVectorGeometry() {
  const node = {
    fillGeometry: [{ path: 'M 0 0 L 100 0 L 100 100 Z', windingRule: 'EVENODD' }],
  };
  const result = pathGen.parseVectorGeometry(node);
  assert('fill rule', result.fillRule, 'evenodd');
  assertTrue('has commands', result.commands.length > 0);

  const empty = pathGen.parseVectorGeometry({});
  assert('empty commands', empty.commands, []);
}

/**
 * Test multiple geometry paths
 */
function testMultiGeometry() {
  const node = {
    fillGeometry: [
      { path: 'M 0 0 L 10 0 Z' },
      { path: 'M 20 20 L 30 20 Z' },
    ],
  };
  const result = pathGen.parseVectorGeometry(node);
  assertTrue('multi-path commands combined', result.commands.length >= 4);
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
