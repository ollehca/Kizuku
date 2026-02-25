/**
 * Tests for Kizuku Text Formatter
 * Covers text properties, per-char overrides, paragraph structure.
 */

const text = require('../src/services/figma/kizuku-text-formatter');

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
 * Run all text formatter tests
 */
function runTests() {
  console.log('\n--- Text Formatter Tests ---');
  testMappers();
  testDefaultStyle();
  testBuildTextRuns();
  testParagraphSplit();
  testParagraphSet();
  testPerCharOverrides();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

/**
 * Test mapping functions
 */
function testMappers() {
  assert('underline', text.mapTextDecoration('UNDERLINE'), 'underline');
  assert('strikethrough', text.mapTextDecoration('STRIKETHROUGH'), 'line-through');
  assert('no decoration', text.mapTextDecoration('NONE'), 'none');
  assert('uppercase', text.mapTextCase('UPPER'), 'uppercase');
  assert('lowercase', text.mapTextCase('LOWER'), 'lowercase');
  assert('original case', text.mapTextCase('ORIGINAL'), 'none');
  assert('align left', text.mapTextAlign('LEFT'), 'left');
  assert('align center', text.mapTextAlign('CENTER'), 'center');
  assert('align justify', text.mapTextAlign('JUSTIFIED'), 'justify');
  assert('valign top', text.mapVerticalAlign('TOP'), 'top');
  assert('valign center', text.mapVerticalAlign('CENTER'), 'center');
  assert('grow auto-width', text.mapGrowType('WIDTH_AND_HEIGHT'), 'auto-width');
  assert('grow fixed', text.mapGrowType('NONE'), 'fixed');
}

/**
 * Test default style extraction
 */
function testDefaultStyle() {
  const node = {
    style: {
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: 700,
      italic: true,
      textAlignHorizontal: 'CENTER',
    },
    textAutoResize: 'HEIGHT',
  };
  const style = text.extractDefaultStyle(node);
  assert('font family', style.fontFamily, 'Inter');
  assert('font size', style.fontSize, 24);
  assert('font weight', style.fontWeight, 700);
  assert('italic', style.italic, true);
  assert('text auto resize', style.textAutoResize, 'HEIGHT');
}

/**
 * Test text run building
 */
function testBuildTextRuns() {
  const runs = text.buildTextRuns('Hello', null, null, { fontFamily: 'Arial' });
  assert('single run text', runs[0].text, 'Hello');
  assert('single run style', runs[0].style.fontFamily, 'Arial');

  const overrideRuns = text.buildTextRuns(
    'AB',
    [0, 1],
    { 1: { fontWeight: 700 } },
    { fontFamily: 'Arial', fontWeight: 400 }
  );
  assert('override run count', overrideRuns.length, 2);
  assert('first run default weight', overrideRuns[0].style.fontWeight, 400);
  assert('second run bold weight', overrideRuns[1].style.fontWeight, 700);
}

/**
 * Test paragraph splitting
 */
function testParagraphSplit() {
  const runs = [
    { text: 'Line 1\nLine 2', style: {}, fills: null },
  ];
  const paras = text.splitIntoParagraphs(runs);
  assert('two paragraphs', paras.length, 2);
  assert('first para text', paras[0][0].text, 'Line 1');
  assert('second para text', paras[1][0].text, 'Line 2');
}

/**
 * Test full paragraph set building
 */
function testParagraphSet() {
  const node = {
    characters: 'Hello World',
    style: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'CENTER',
    },
    textAutoResize: 'HEIGHT',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
  };
  const result = text.buildParagraphSet(node);
  assert('root type', result.type, 'root');
  assert('vertical align', result['vertical-align'], 'center');
  assert('grow type', result['grow-type'], 'auto-height');
  assert('paragraph set', result.children[0].type, 'paragraph-set');
  const para = result.children[0].children[0];
  assert('paragraph align', para['text-align'], 'center');
}

/**
 * Test per-character color overrides
 */
function testPerCharOverrides() {
  const node = {
    characters: 'AB',
    style: { fontFamily: 'Arial', fontSize: 16, fontWeight: 400 },
    characterStyleOverrides: [0, 1],
    styleOverrideTable: {
      1: {
        fontWeight: 700,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
      },
    },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
  };
  const result = text.buildParagraphSet(node);
  const runs = result.children[0].children[0].children;
  assert('two text runs', runs.length, 2);
  assert('second run color', runs[1]['fill-color'], '#ff0000');
}

const failures = runTests();
process.exit(failures > 0 ? 1 : 0);
