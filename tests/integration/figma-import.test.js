/**
 * Integration test for the full Figma import pipeline.
 * Tests FigmaJSONConverter end-to-end with fixture data.
 */

const {
  FigmaJSONConverter,
} = require('../../src/services/figma/figma-json-converter');

const {
  resetIds,
  createDocument,
  createCanvas,
  createFrame,
  createRectangle,
  createEllipse,
  createText,
  createLine,
} = require('../fixtures/figma-nodes');

describe('FigmaJSONConverter integration', () => {
  let converter;

  beforeEach(() => {
    resetIds();
    converter = new FigmaJSONConverter();
  });

  test('converts empty document', async () => {
    const doc = createDocument([]);
    const result = await converter.convert(doc);

    expect(result.project).toBeDefined();
    expect(result.project.type).toBe('kizuku-project');
    expect(result.project.data.pages).toHaveLength(0);
    expect(result.stats).toBeDefined();
    expect(result.compatibilityScore).toBeDefined();
  });

  test('converts document with one page', async () => {
    const doc = createDocument([createCanvas('Main Page')]);
    const result = await converter.convert(doc);

    expect(result.project.data.pages).toHaveLength(1);
    expect(result.project.data.pages[0].name).toBe('Main Page');
  });

  test('converts page with shapes', async () => {
    const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    const ellipse = createEllipse({ x: 200, y: 100, width: 80, height: 80 });
    const canvas = createCanvas('Shapes', [
      createFrame({
        x: 0, y: 0,
        width: 500, height: 400,
        children: [rect, ellipse],
      }),
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    const page = result.project.data.pages[0];
    expect(page.children).toHaveLength(1);

    const frame = page.children[0];
    expect(frame.type).toBe('frame');
    expect(frame.children).toHaveLength(2);
    expect(frame.children[0].type).toBe('rect');
    expect(frame.children[1].type).toBe('circle');
  });

  test('preserves text content', async () => {
    const text = createText({
      x: 50, y: 50,
      characters: 'Hello Kizu',
    });
    const canvas = createCanvas('Text', [
      createFrame({ children: [text] }),
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    const textNode = result.project.data.pages[0].children[0].children[0];
    expect(textNode.type).toBe('text');
  });

  test('tracks conversion statistics', async () => {
    const canvas = createCanvas('Stats', [
      createFrame({
        children: [
          createRectangle({}),
          createEllipse({}),
          createLine({}),
        ],
      }),
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    // 1 frame + 3 shapes = 4 converted nodes
    expect(result.stats.convertedNodes).toBe(4);
    expect(result.stats.skippedNodes).toBe(0);
  });

  test('handles unsupported node types gracefully', async () => {
    const canvas = createCanvas('Unsupported', [
      {
        id: '99:1',
        type: 'WIDGET',
        name: 'Unknown Widget',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fills: [],
        strokes: [],
        effects: [],
        visible: true,
        opacity: 1,
      },
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    expect(result.stats.skippedNodes).toBe(1);
    expect(result.stats.warnings.length).toBeGreaterThan(0);
  });

  test('generates unique UUIDs for each node', async () => {
    const rect1 = createRectangle({ x: 0, y: 0 });
    const rect2 = createRectangle({ x: 100, y: 0 });
    const canvas = createCanvas('IDs', [
      createFrame({ children: [rect1, rect2] }),
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    const children = result.project.data.pages[0].children[0].children;
    expect(children[0].id).not.toBe(children[1].id);
  });

  test('calculates compatibility score', async () => {
    const canvas = createCanvas('Score', [
      createFrame({
        children: [
          createRectangle({}),
          createEllipse({}),
        ],
      }),
    ]);
    const doc = createDocument([canvas]);
    const result = await converter.convert(doc);

    expect(result.compatibilityScore).toBeGreaterThan(0);
    expect(result.compatibilityScore).toBeLessThanOrEqual(100);
  });

  test('preserves project metadata', async () => {
    const doc = createDocument([createCanvas('Page')]);
    const metadata = {
      name: 'My Design',
      description: 'A test design',
      author: { name: 'Designer', email: 'test@test.com' },
    };
    const result = await converter.convert(doc, metadata);

    expect(result.project.metadata.name).toBe('My Design');
    expect(result.project.metadata.description).toBe('A test design');
  });

  test('resets stats between conversions', async () => {
    const doc1 = createDocument([
      createCanvas('P1', [createFrame({ children: [createRectangle({})] })]),
    ]);
    await converter.convert(doc1);
    expect(converter.getStats().convertedNodes).toBeGreaterThan(0);

    resetIds();
    const doc2 = createDocument([createCanvas('P2')]);
    await converter.convert(doc2);
    // After second conversion, stats should reflect only doc2
    expect(converter.getStats().convertedNodes).toBe(0);
  });
});
