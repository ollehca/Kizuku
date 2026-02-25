/**
 * Tests for kizuku-to-penpot-converter.js
 * Verifies conversion from Kizuku format to PenPot flat structure.
 */

const {
  convertFillsToPenpot,
  convertStrokesToPenpot,
  convertPathCommands,
  flattenChildren,
  convertKizuToPenpotFile,
} = require('../../../src/services/kizuku-to-penpot-converter');

describe('convertFillsToPenpot', () => {
  test('returns empty array for null', () => {
    expect(convertFillsToPenpot(null)).toEqual([]);
  });

  test('returns empty array for non-array', () => {
    expect(convertFillsToPenpot('not-array')).toEqual([]);
  });

  test('converts color string fill', () => {
    const fills = [{ color: '#ff0000', opacity: 0.8 }];
    const result = convertFillsToPenpot(fills);
    expect(result).toHaveLength(1);
    expect(result[0]['fill-color']).toBe('#ff0000');
    expect(result[0]['fill-opacity']).toBe(0.8);
  });

  test('passes through already-formatted fill', () => {
    const fills = [{ 'fill-color': '#00ff00', 'fill-opacity': 1 }];
    const result = convertFillsToPenpot(fills);
    expect(result).toEqual(fills);
  });

  test('defaults opacity to 1 when missing', () => {
    const fills = [{ color: '#000000' }];
    const result = convertFillsToPenpot(fills);
    expect(result[0]['fill-opacity']).toBe(1);
  });

  test('defaults to black for unknown fill format', () => {
    const fills = [{ unknown: true }];
    const result = convertFillsToPenpot(fills);
    expect(result[0]['fill-color']).toBe('#000000');
  });
});

describe('convertStrokesToPenpot', () => {
  test('returns empty array for null', () => {
    expect(convertStrokesToPenpot(null)).toEqual([]);
  });

  test('converts color string stroke', () => {
    const strokes = [{ color: '#0000ff', opacity: 1, width: 2 }];
    const result = convertStrokesToPenpot(strokes);
    expect(result).toHaveLength(1);
    expect(result[0]['stroke-color']).toBe('#0000ff');
    expect(result[0]['stroke-width']).toBe(2);
    expect(result[0]['stroke-style']).toBe('solid');
    expect(result[0]['stroke-alignment']).toBe('center');
  });

  test('passes through already-formatted stroke', () => {
    const strokes = [{ 'stroke-color': '#ff0000' }];
    const result = convertStrokesToPenpot(strokes);
    expect(result).toEqual(strokes);
  });

  test('filters out null strokes', () => {
    const strokes = [{ unknown: true }];
    const result = convertStrokesToPenpot(strokes);
    expect(result).toHaveLength(0);
  });
});

describe('convertPathCommands', () => {
  test('converts M command', () => {
    const commands = [{ command: 'M', x: 10, y: 20 }];
    expect(convertPathCommands(commands)).toBe('M 10 20');
  });

  test('converts L command', () => {
    const commands = [{ command: 'L', x: 50, y: 60 }];
    expect(convertPathCommands(commands)).toBe('L 50 60');
  });

  test('converts C (cubic bezier) command', () => {
    const commands = [{
      command: 'C',
      x1: 10, y1: 20,
      x2: 30, y2: 40,
      x: 50, y: 60,
    }];
    expect(convertPathCommands(commands)).toBe('C 10 20 30 40 50 60');
  });

  test('converts Z command', () => {
    const commands = [{ command: 'Z' }];
    expect(convertPathCommands(commands)).toBe('Z');
  });

  test('converts full path', () => {
    const commands = [
      { command: 'M', x: 0, y: 0 },
      { command: 'L', x: 100, y: 0 },
      { command: 'L', x: 100, y: 100 },
      { command: 'Z' },
    ];
    expect(convertPathCommands(commands)).toBe('M 0 0 L 100 0 L 100 100 Z');
  });
});

describe('flattenChildren', () => {
  test('returns empty array for no children', () => {
    const objects = {};
    const ids = flattenChildren([], objects, 'root', 'root');
    expect(ids).toEqual([]);
    expect(Object.keys(objects)).toHaveLength(0);
  });

  test('flattens single child into objects map', () => {
    const children = [{
      id: 'child-1',
      type: 'rect',
      name: 'Rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    }];
    const objects = {};
    const ids = flattenChildren(children, objects, 'frame-1', 'parent-1');

    expect(ids).toEqual(['child-1']);
    expect(objects['child-1']).toBeDefined();
    expect(objects['child-1']['frame-id']).toBe('frame-1');
    expect(objects['child-1']['parent-id']).toBe('parent-1');
  });

  test('handles nested children recursively', () => {
    const children = [{
      id: 'frame-nested',
      type: 'frame',
      name: 'Nested Frame',
      x: 0, y: 0, width: 200, height: 200,
      children: [{
        id: 'inner-rect',
        type: 'rect',
        name: 'Inner',
        x: 10, y: 10, width: 50, height: 50,
      }],
    }];
    const objects = {};
    flattenChildren(children, objects, 'root', 'root');

    expect(objects['frame-nested']).toBeDefined();
    expect(objects['inner-rect']).toBeDefined();
    expect(objects['frame-nested'].shapes).toEqual(['inner-rect']);
    // Frame children use the frame as their frame-id
    expect(objects['inner-rect']['frame-id']).toBe('frame-nested');
    expect(objects['inner-rect']['parent-id']).toBe('frame-nested');
  });

  test('handles path nodes with commands', () => {
    const children = [{
      id: 'path-1',
      type: 'path',
      name: 'Path',
      x: 0, y: 0, width: 100, height: 100,
      commands: [
        { command: 'M', x: 0, y: 0 },
        { command: 'L', x: 100, y: 0 },
      ],
    }];
    const objects = {};
    flattenChildren(children, objects, 'root', 'root');

    expect(objects['path-1'].content).toBe('M 0 0 L 100 0');
  });
});

describe('convertKizuToPenpotFile', () => {
  test('converts minimal kizuku project to penpot file', () => {
    const kizukuProject = {
      metadata: {
        id: 'test-id-123',
        name: 'Test Project',
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-01T00:00:00Z',
      },
      data: {
        pages: [{
          id: 'page-1',
          name: 'Page 1',
          children: [],
        }],
      },
    };

    const result = convertKizuToPenpotFile(kizukuProject);
    expect(result.id).toBe('test-id-123');
    expect(result.name).toBe('Test Project');
    expect(result.version).toBe(22);
    expect(result.data.pages).toEqual(['page-1']);
    expect(result.data['pages-index']['page-1']).toBeDefined();
    expect(result.data['pages-index']['page-1'].name).toBe('Page 1');
  });

  test('includes root frame in page objects', () => {
    const kizukuProject = {
      metadata: { id: 'id', name: 'Test', created: '', modified: '' },
      data: {
        pages: [{ id: 'p1', name: 'Page', children: [] }],
      },
    };

    const result = convertKizuToPenpotFile(kizukuProject);
    const rootId = '00000000-0000-0000-0000-000000000000';
    const pageObjs = result.data['pages-index']['p1'].objects;
    expect(pageObjs[rootId]).toBeDefined();
    expect(pageObjs[rootId].type).toBe('frame');
    expect(pageObjs[rootId].name).toBe('Root Frame');
  });
});
