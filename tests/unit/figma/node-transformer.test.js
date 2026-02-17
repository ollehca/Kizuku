/**
 * Tests for kizu-node-transformer.js
 * Verifies node type transformation functions.
 */

const {
  buildDispatch,
  transformAutoLayout,
  transformConstraints,
  transformTextAlign,
  transformBooleanType,
  transformLineToPath,
} = require('../../../src/services/figma/kizu-node-transformer');

const {
  createRectangle,
  createEllipse,
  createText,
  createLine,
  createFrame,
  createComponent,
  createInstance,
  createBooleanOp,
  createStar,
  createPolygon,
} = require('../../fixtures/figma-nodes');

/**
 * Create a mock converter for testing dispatch functions
 * @returns {object} Mock converter with jest spies
 */
function createMockConverter() {
  return {
    stats: {
      totalNodes: 0,
      convertedNodes: 0,
      skippedNodes: 0,
      errors: [],
      warnings: [],
      unsupportedFeatures: new Set(),
    },
    getOrCreateUuid: jest.fn((id) => `uuid-${id}`),
    transformCommonProperties: jest.fn((node) => ({
      x: node.absoluteBoundingBox?.x || 0,
      y: node.absoluteBoundingBox?.y || 0,
      width: node.absoluteBoundingBox?.width || 100,
      height: node.absoluteBoundingBox?.height || 100,
      visible: true,
      opacity: 1,
      rotation: 0,
      fills: [],
      strokes: [],
      strokeWeight: 0,
      effects: [],
      blendMode: 'normal',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    })),
    transformChildren: jest.fn().mockResolvedValue([]),
    addWarning: jest.fn(),
    addError: jest.fn(),
  };
}

describe('transformTextAlign', () => {
  test('maps LEFT to left', () => {
    expect(transformTextAlign('LEFT')).toBe('left');
  });

  test('maps CENTER to center', () => {
    expect(transformTextAlign('CENTER')).toBe('center');
  });

  test('maps RIGHT to right', () => {
    expect(transformTextAlign('RIGHT')).toBe('right');
  });

  test('maps JUSTIFIED to justify', () => {
    expect(transformTextAlign('JUSTIFIED')).toBe('justify');
  });

  test('defaults to left for unknown', () => {
    expect(transformTextAlign('UNKNOWN')).toBe('left');
  });
});

describe('transformBooleanType', () => {
  test('maps UNION to union', () => {
    expect(transformBooleanType('UNION')).toBe('union');
  });

  test('maps INTERSECT to intersection', () => {
    expect(transformBooleanType('INTERSECT')).toBe('intersection');
  });

  test('maps SUBTRACT to difference', () => {
    expect(transformBooleanType('SUBTRACT')).toBe('difference');
  });

  test('maps EXCLUDE to exclusion', () => {
    expect(transformBooleanType('EXCLUDE')).toBe('exclusion');
  });

  test('defaults to union for unknown', () => {
    expect(transformBooleanType('UNKNOWN')).toBe('union');
  });
});

describe('transformLineToPath', () => {
  test('creates M and L commands from line', () => {
    const line = createLine({ x: 10, y: 20, length: 200 });
    const result = transformLineToPath(line);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ command: 'M', x: 0, y: 0 });
    expect(result[1]).toEqual({ command: 'L', x: 200, y: 0 });
  });
});

describe('transformAutoLayout', () => {
  test('maps HORIZONTAL to row', () => {
    const result = transformAutoLayout({ layoutMode: 'HORIZONTAL' });
    expect(result.mode).toBe('row');
  });

  test('maps VERTICAL to column', () => {
    const result = transformAutoLayout({ layoutMode: 'VERTICAL' });
    expect(result.mode).toBe('column');
  });

  test('preserves spacing and padding', () => {
    const result = transformAutoLayout({
      layoutMode: 'HORIZONTAL',
      itemSpacing: 16,
      paddingTop: 8,
      paddingRight: 12,
      paddingBottom: 8,
      paddingLeft: 12,
    });
    expect(result.gap).toBe(16);
    expect(result.padding.top).toBe(8);
    expect(result.padding.right).toBe(12);
  });
});

describe('transformConstraints', () => {
  test('returns defaults for null', () => {
    const result = transformConstraints(null);
    expect(result).toEqual({ horizontal: 'MIN', vertical: 'MIN' });
  });

  test('passes through constraint values', () => {
    const result = transformConstraints({
      horizontal: 'CENTER',
      vertical: 'STRETCH',
    });
    expect(result.horizontal).toBe('CENTER');
    expect(result.vertical).toBe('STRETCH');
  });
});

describe('buildDispatch', () => {
  let converter;
  let dispatch;

  beforeEach(() => {
    converter = createMockConverter();
    dispatch = buildDispatch(converter);
  });

  test('has handlers for all supported types', () => {
    const types = [
      'FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'TEXT',
      'VECTOR', 'STAR', 'LINE', 'REGULAR_POLYGON',
      'BOOLEAN_OPERATION', 'COMPONENT', 'INSTANCE',
      'COMPONENT_SET',
    ];
    types.forEach((type) => {
      expect(dispatch[type]).toBeDefined();
    });
  });

  test('transforms RECTANGLE to rect type', () => {
    const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    const result = dispatch.RECTANGLE(rect);
    expect(result.type).toBe('rect');
    expect(result.name).toBe('Rectangle');
    expect(converter.stats.convertedNodes).toBe(1);
  });

  test('transforms ELLIPSE to circle type', () => {
    const ellipse = createEllipse({ x: 0, y: 0 });
    const result = dispatch.ELLIPSE(ellipse);
    expect(result.type).toBe('circle');
    expect(converter.stats.convertedNodes).toBe(1);
  });

  test('transforms TEXT with content', () => {
    const text = createText({ characters: 'Test text' });
    const result = dispatch.TEXT(text);
    expect(result.type).toBe('text');
    expect(converter.stats.convertedNodes).toBe(1);
  });

  test('transforms LINE to path with commands', () => {
    const line = createLine({ length: 150 });
    const result = dispatch.LINE(line);
    expect(result.type).toBe('path');
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].command).toBe('M');
    expect(result.commands[1].command).toBe('L');
  });

  test('transforms FRAME with children', async () => {
    const frame = createFrame({ name: 'Test Frame' });
    const result = await dispatch.FRAME(frame);
    expect(result.type).toBe('frame');
    expect(result.name).toBe('Test Frame');
    expect(converter.transformChildren).toHaveBeenCalled();
  });

  test('transforms GROUP as group type', async () => {
    const group = { ...createFrame(), type: 'GROUP', name: 'My Group' };
    const result = await dispatch.GROUP(group);
    expect(result.type).toBe('group');
  });

  test('transforms COMPONENT', async () => {
    const comp = createComponent({ name: 'Button' });
    const result = await dispatch.COMPONENT(comp);
    expect(result.type).toBe('component');
  });

  test('transforms INSTANCE with componentId', () => {
    const inst = createInstance({ componentId: 'comp-123' });
    const result = dispatch.INSTANCE(inst);
    expect(result.type).toBe('instance');
    expect(result.componentId).toBeDefined();
  });

  test('transforms BOOLEAN_OPERATION', async () => {
    const bool = createBooleanOp({ operation: 'SUBTRACT' });
    const result = await dispatch.BOOLEAN_OPERATION(bool);
    expect(result.type).toBe('bool');
    expect(result.boolType).toBe('difference');
  });

  test('STAR produces path type', () => {
    const star = createStar({ pointCount: 5 });
    const result = dispatch.STAR(star);
    expect(result.type).toBe('path');
  });

  test('REGULAR_POLYGON produces path type', () => {
    const polygon = createPolygon({ sideCount: 6 });
    const result = dispatch.REGULAR_POLYGON(polygon);
    expect(result.type).toBe('path');
  });
});
