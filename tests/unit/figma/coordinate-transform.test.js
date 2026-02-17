/**
 * Tests for coordinate conversion (absolute → relative)
 * These test the FigmaJSONConverter's transformGeometry method
 * which must subtract parent position from child absolute coordinates.
 *
 * Written TDD-style: tests define the expected behavior BEFORE the fix.
 */

const {
  FigmaJSONConverter,
} = require('../../../src/services/figma/figma-json-converter');

const {
  resetIds,
  createDocument,
  createCanvas,
  createFrame,
  createRectangle,
  createEllipse,
} = require('../../fixtures/figma-nodes');

describe('Coordinate Conversion (absolute → relative)', () => {
  let converter;

  beforeEach(() => {
    resetIds();
    converter = new FigmaJSONConverter();
  });

  test('top-level frame keeps absolute position (relative to canvas)', async () => {
    const frame = createFrame({ x: 500, y: 300, width: 400, height: 300 });
    const doc = createDocument([createCanvas('Page', [frame])]);

    const result = await converter.convert(doc);
    const page = result.project.data.pages[0];
    const topFrame = page.children[0];

    expect(topFrame.x).toBe(500);
    expect(topFrame.y).toBe(300);
  });

  test('child rect uses position relative to parent frame', async () => {
    const rect = createRectangle({
      x: 150, y: 200,
      width: 50, height: 50,
    });
    const frame = createFrame({
      x: 100, y: 100,
      width: 400, height: 300,
      children: [rect],
    });
    const doc = createDocument([createCanvas('Page', [frame])]);

    const result = await converter.convert(doc);
    const page = result.project.data.pages[0];
    const childRect = page.children[0].children[0];

    // Child at absolute (150,200) inside parent at (100,100)
    // Relative position should be (50, 100)
    expect(childRect.x).toBe(50);
    expect(childRect.y).toBe(100);
  });

  test('nested children use relative coordinates at each level', async () => {
    const innerRect = createRectangle({
      x: 300, y: 400,
      width: 30, height: 30,
    });
    const innerFrame = createFrame({
      x: 200, y: 300,
      width: 200, height: 200,
      children: [innerRect],
    });
    const outerFrame = createFrame({
      x: 100, y: 100,
      width: 400, height: 400,
      children: [innerFrame],
    });
    const doc = createDocument([createCanvas('Page', [outerFrame])]);

    const result = await converter.convert(doc);
    const page = result.project.data.pages[0];

    const outerChild = page.children[0];
    const inner = outerChild.children[0];
    const deepRect = inner.children[0];

    // outerFrame at (100,100) → relative to canvas: (100,100)
    expect(outerChild.x).toBe(100);
    expect(outerChild.y).toBe(100);

    // innerFrame at absolute (200,300) → relative to outer (100,100): (100,200)
    expect(inner.x).toBe(100);
    expect(inner.y).toBe(200);

    // innerRect at absolute (300,400) → relative to inner (200,300): (100,100)
    expect(deepRect.x).toBe(100);
    expect(deepRect.y).toBe(100);
  });

  test('multiple children in same parent have correct relative positions', async () => {
    const rect1 = createRectangle({ x: 110, y: 110, width: 50, height: 50 });
    const rect2 = createRectangle({ x: 200, y: 150, width: 80, height: 80 });
    const frame = createFrame({
      x: 100, y: 100,
      width: 300, height: 300,
      children: [rect1, rect2],
    });
    const doc = createDocument([createCanvas('Page', [frame])]);

    const result = await converter.convert(doc);
    const page = result.project.data.pages[0];
    const children = page.children[0].children;

    // rect1 at (110,110) relative to parent (100,100) = (10,10)
    expect(children[0].x).toBe(10);
    expect(children[0].y).toBe(10);

    // rect2 at (200,150) relative to parent (100,100) = (100,50)
    expect(children[1].x).toBe(100);
    expect(children[1].y).toBe(50);
  });

  test('child at origin of parent has position (0,0)', async () => {
    const rect = createRectangle({ x: 100, y: 100, width: 50, height: 50 });
    const frame = createFrame({
      x: 100, y: 100,
      width: 200, height: 200,
      children: [rect],
    });
    const doc = createDocument([createCanvas('Page', [frame])]);

    const result = await converter.convert(doc);
    const child = result.project.data.pages[0].children[0].children[0];

    expect(child.x).toBe(0);
    expect(child.y).toBe(0);
  });
});
