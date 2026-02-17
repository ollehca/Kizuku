/**
 * Tests for kizu-text-formatter.js
 * Verifies PenPot rich text format generation from Figma text nodes.
 *
 * Written TDD-style: tests define the expected behavior BEFORE implementation.
 */

// This will be created in Phase 2.2
const {
  buildParagraphSet,
  buildTextRuns,
  formatTextRun,
  splitIntoParagraphs,
} = require('../../../src/services/figma/kizu-text-formatter');

const { createText } = require('../../fixtures/figma-nodes');

describe('buildParagraphSet', () => {
  test('creates paragraph-set structure for plain text', () => {
    const textNode = createText({ characters: 'Hello World' });
    const result = buildParagraphSet(textNode);

    expect(result.type).toBe('root');
    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe('paragraph-set');

    const paragraphs = result.children[0].children;
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].type).toBe('paragraph');
    expect(paragraphs[0].children[0].text).toBe('Hello World');
  });

  test('preserves font properties', () => {
    const textNode = createText({
      characters: 'Styled text',
      style: {
        fontFamily: 'Roboto',
        fontSize: 24,
        fontWeight: 700,
        textAlignHorizontal: 'CENTER',
        lineHeightPx: 32,
      },
    });
    const result = buildParagraphSet(textNode);
    const run = result.children[0].children[0].children[0];

    expect(run['font-family']).toBe('Roboto');
    expect(run['font-size']).toBe('24');
    expect(run['font-weight']).toBe('700');
  });

  test('extracts fill color from text fills', () => {
    const textNode = createText({
      characters: 'Red text',
      fills: [{
        type: 'SOLID',
        color: { r: 1, g: 0, b: 0, a: 1 },
        visible: true,
      }],
    });
    const result = buildParagraphSet(textNode);
    const run = result.children[0].children[0].children[0];

    expect(run['fill-color']).toBe('#ff0000');
    expect(run['fill-opacity']).toBe(1);
  });

  test('splits multi-line text into paragraphs', () => {
    const textNode = createText({ characters: 'Line 1\nLine 2\nLine 3' });
    const result = buildParagraphSet(textNode);
    const paragraphs = result.children[0].children;

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].children[0].text).toBe('Line 1');
    expect(paragraphs[1].children[0].text).toBe('Line 2');
    expect(paragraphs[2].children[0].text).toBe('Line 3');
  });

  test('handles characterStyleOverrides for mixed styling', () => {
    const textNode = createText({
      characters: 'Hello World',
      style: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 400,
      },
      overrides: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      overrideTable: {
        1: {
          fontWeight: 700,
          fills: [{
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0, a: 1 },
          }],
        },
      },
    });
    const result = buildParagraphSet(textNode);
    const runs = result.children[0].children[0].children;

    // Should split into 2 runs: "Hello" (default) and " World" (bold red)
    expect(runs).toHaveLength(2);
    expect(runs[0].text).toBe('Hello');
    expect(runs[0]['font-weight']).toBe('400');
    expect(runs[1].text).toBe(' World');
    expect(runs[1]['font-weight']).toBe('700');
  });
});

describe('buildTextRuns', () => {
  const defaultStyle = {
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
  };

  test('single run for text with no overrides', () => {
    const runs = buildTextRuns('Hello', [], {}, defaultStyle);
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('Hello');
    expect(runs[0].styleIndex).toBe(0);
  });

  test('groups consecutive same-style characters', () => {
    const overrides = [0, 0, 0, 1, 1, 1];
    const runs = buildTextRuns('AAABBB', overrides, {}, defaultStyle);
    expect(runs).toHaveLength(2);
    expect(runs[0].text).toBe('AAA');
    expect(runs[1].text).toBe('BBB');
  });

  test('handles alternating styles', () => {
    const overrides = [0, 1, 0, 1];
    const runs = buildTextRuns('ABCD', overrides, {}, defaultStyle);
    expect(runs).toHaveLength(4);
  });
});

describe('formatTextRun', () => {
  test('formats run with basic style', () => {
    const style = { fontFamily: 'Inter', fontSize: 16, fontWeight: 400 };
    const result = formatTextRun('Hello', style, []);
    expect(result.text).toBe('Hello');
    expect(result['font-family']).toBe('Inter');
    expect(result['font-size']).toBe('16');
    expect(result['font-weight']).toBe('400');
  });

  test('extracts fill color from fills array', () => {
    const style = { fontFamily: 'Inter', fontSize: 16 };
    const fills = [{
      type: 'SOLID',
      color: { r: 0, g: 0, b: 1, a: 1 },
    }];
    const result = formatTextRun('Blue', style, fills);
    expect(result['fill-color']).toBe('#0000ff');
  });

  test('defaults fill to black when no fills', () => {
    const style = { fontFamily: 'Inter', fontSize: 16 };
    const result = formatTextRun('Text', style, []);
    expect(result['fill-color']).toBe('#000000');
  });
});

describe('splitIntoParagraphs', () => {
  test('single line stays as one paragraph', () => {
    const runs = [{ text: 'Hello', style: {} }];
    const result = splitIntoParagraphs(runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
  });

  test('splits run at newline into paragraphs', () => {
    const runs = [{ text: 'Line 1\nLine 2', style: {} }];
    const result = splitIntoParagraphs(runs);
    expect(result).toHaveLength(2);
  });

  test('preserves runs within same line', () => {
    const runs = [
      { text: 'Bold ', style: { fontWeight: 700 } },
      { text: 'normal', style: { fontWeight: 400 } },
    ];
    const result = splitIntoParagraphs(runs);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });
});
