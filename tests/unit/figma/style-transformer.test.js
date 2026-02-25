/**
 * Tests for kizuku-style-transformer.js
 * Verifies color, fill, stroke, effect, and blend mode conversion.
 */

const {
  transformColor,
  transformFills,
  transformStrokes,
  transformEffects,
  transformBlendMode,
  transformGradient,
} = require('../../../src/services/figma/kizuku-style-transformer');

describe('transformColor', () => {
  test('converts black (0,0,0) to #000000', () => {
    expect(transformColor({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
  });

  test('converts white (1,1,1) to #ffffff', () => {
    expect(transformColor({ r: 1, g: 1, b: 1, a: 1 })).toBe('#ffffff');
  });

  test('converts mid-range color correctly', () => {
    const result = transformColor({ r: 0.2, g: 0.6, b: 1, a: 1 });
    expect(result).toBe('#3399ff');
  });

  test('returns rgba for alpha < 1', () => {
    const result = transformColor({ r: 1, g: 0, b: 0, a: 0.5 });
    expect(result).toBe('rgba(255, 0, 0, 0.5)');
  });

  test('returns #000000 for null input', () => {
    expect(transformColor(null)).toBe('#000000');
  });

  test('returns #000000 for undefined input', () => {
    expect(transformColor(undefined)).toBe('#000000');
  });

  test('defaults alpha to 1 when missing', () => {
    const result = transformColor({ r: 0.5, g: 0.5, b: 0.5 });
    expect(result).toBe('#808080');
  });
});

describe('transformFills', () => {
  const warn = jest.fn();
  const unsupported = new Set();

  beforeEach(() => {
    warn.mockClear();
    unsupported.clear();
  });

  test('returns empty array for null input', () => {
    expect(transformFills(null, warn, unsupported)).toEqual([]);
  });

  test('returns empty array for empty array', () => {
    expect(transformFills([], warn, unsupported)).toEqual([]);
  });

  test('converts SOLID fill', () => {
    const fills = [{
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
    }];
    const result = transformFills(fills, warn, unsupported);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('color');
    expect(result[0].color).toBe('#ff0000');
    expect(result[0].opacity).toBe(1);
  });

  test('filters out invisible fills', () => {
    const fills = [{
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0, a: 1 },
      visible: false,
    }];
    const result = transformFills(fills, warn, unsupported);
    expect(result).toHaveLength(0);
  });

  test('handles GRADIENT_LINEAR fill', () => {
    const fills = [{
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      visible: true,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
    }];
    const result = transformFills(fills, warn, unsupported);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('gradient');
    expect(result[0].gradient.stops).toHaveLength(2);
  });

  test('converts IMAGE fill to image type', () => {
    const fills = [{
      type: 'IMAGE',
      opacity: 1,
      visible: true,
      imageRef: 'abc123',
    }];
    const result = transformFills(fills, warn, unsupported);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('image');
    expect(result[0].imageRef).toBe('abc123');
  });
});

describe('transformStrokes', () => {
  test('returns empty array for null input', () => {
    expect(transformStrokes(null)).toEqual([]);
  });

  test('converts stroke with color', () => {
    const strokes = [{
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
    }];
    const result = transformStrokes(strokes);
    expect(result).toHaveLength(1);
    expect(result[0].color).toBe('#000000');
  });

  test('filters invisible strokes', () => {
    const strokes = [{
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0, a: 1 },
      visible: false,
    }];
    expect(transformStrokes(strokes)).toHaveLength(0);
  });
});

describe('transformEffects', () => {
  const warn = jest.fn();

  beforeEach(() => warn.mockClear());

  test('returns empty array for null', () => {
    expect(transformEffects(null, warn)).toEqual([]);
  });

  test('converts DROP_SHADOW', () => {
    const effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 4, y: 4 },
      radius: 8,
      spread: 0,
      visible: true,
    }];
    const result = transformEffects(effects, warn);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('drop-shadow');
    expect(result[0].blur).toBe(8);
    expect(result[0].offsetX).toBe(4);
  });

  test('converts LAYER_BLUR', () => {
    const effects = [{
      type: 'LAYER_BLUR',
      radius: 10,
      visible: true,
    }];
    const result = transformEffects(effects, warn);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('blur');
    expect(result[0].value).toBe(10);
  });

  test('warns on unsupported effect type', () => {
    const effects = [{
      type: 'UNKNOWN_EFFECT',
      visible: true,
    }];
    transformEffects(effects, warn);
    expect(warn).toHaveBeenCalled();
  });
});

describe('transformBlendMode', () => {
  const warn = jest.fn();
  const unsupported = new Set();

  beforeEach(() => {
    warn.mockClear();
    unsupported.clear();
  });

  test('returns normal for NORMAL', () => {
    expect(transformBlendMode('NORMAL', warn, unsupported)).toBe('normal');
  });

  test('returns normal for PASS_THROUGH', () => {
    expect(transformBlendMode('PASS_THROUGH', warn, unsupported)).toBe('normal');
  });

  test('maps MULTIPLY correctly', () => {
    expect(transformBlendMode('MULTIPLY', warn, unsupported)).toBe('multiply');
  });

  test('maps SCREEN correctly', () => {
    expect(transformBlendMode('SCREEN', warn, unsupported)).toBe('screen');
  });

  test('returns normal for null/undefined', () => {
    expect(transformBlendMode(null, warn, unsupported)).toBe('normal');
    expect(transformBlendMode(undefined, warn, unsupported)).toBe('normal');
  });

  test('warns on unknown blend mode', () => {
    transformBlendMode('UNKNOWN_MODE', warn, unsupported);
    expect(warn).toHaveBeenCalled();
    expect(unsupported.has('blend-mode-UNKNOWN_MODE')).toBe(true);
  });
});

describe('transformGradient', () => {
  test('transforms linear gradient', () => {
    const result = transformGradient({
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
    });
    expect(result.type).toBe('linear');
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].color).toBe('#ff0000');
    expect(result.stops[1].color).toBe('#0000ff');
  });
});
