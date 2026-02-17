/**
 * Kizu to PenPot Format Converter
 * Converts Kizu's nested project format to PenPot's flat file structure.
 * Also contains the hardcoded test file for backend integration testing.
 */

const crypto = require('crypto');

const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const TEST_FILE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PAGE_ID = '22222222-2222-2222-2222-222222222222';
const TEST_FRAME_ID = '33333333-3333-3333-3333-333333333333';
const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Convert Kizu fills to PenPot format
 * @param {array} fills - Kizu fills array
 * @returns {array} PenPot fills
 */
function convertFillsToPenpot(fills) {
  if (!fills || !Array.isArray(fills)) {
    return [];
  }
  return fills
    .map((fill) => {
      if (fill.color && typeof fill.color === 'string') {
        return {
          'fill-color': fill.color,
          'fill-opacity': fill.opacity ?? 1,
        };
      }
      if (fill['fill-color']) {
        return fill;
      }
      return { 'fill-color': '#000000', 'fill-opacity': 1 };
    })
    .filter((f) => f && f['fill-color']);
}

/**
 * Convert Kizu strokes to PenPot format
 * @param {array} strokes - Kizu strokes array
 * @returns {array} PenPot strokes
 */
function convertStrokesToPenpot(strokes) {
  if (!strokes || !Array.isArray(strokes)) {
    return [];
  }
  return strokes
    .map((stroke) => {
      if (stroke.color && typeof stroke.color === 'string') {
        return {
          'stroke-color': stroke.color,
          'stroke-opacity': stroke.opacity ?? 1,
          'stroke-width': stroke.width || 1,
          'stroke-style': 'solid',
          'stroke-alignment': 'center',
        };
      }
      if (stroke['stroke-color']) {
        return stroke;
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Convert Kizu path commands to SVG path string
 * @param {array} commands - Path command objects
 * @returns {string} SVG path string
 */
function convertPathCommands(commands) {
  return commands
    .map((cmd) => {
      if (cmd.command === 'M') {
        return `M ${cmd.x} ${cmd.y}`;
      } else if (cmd.command === 'L') {
        return `L ${cmd.x} ${cmd.y}`;
      } else if (cmd.command === 'C') {
        return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
      } else if (cmd.command === 'Z') {
        return 'Z';
      }
      return '';
    })
    .join(' ');
}

/**
 * Build computed geometry fields for a PenPot shape
 * @param {number} posX - X position
 * @param {number} posY - Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @returns {object} selrect, points, transform, transform-inverse
 */
function buildGeometry(posX, posY, width, height) {
  return {
    selrect: {
      x: posX,
      y: posY,
      width,
      height,
      x1: posX,
      y1: posY,
      x2: posX + width,
      y2: posY + height,
    },
    points: [
      { x: posX, y: posY },
      { x: posX + width, y: posY },
      { x: posX + width, y: posY + height },
      { x: posX, y: posY + height },
    ],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  };
}

/**
 * Extract display properties from a Kizu child node
 * @param {object} child - Kizu child node
 * @returns {object} Display properties with defaults
 */
function extractDisplayProps(child) {
  return {
    visible: child.visible !== false,
    opacity: child.opacity ?? 1,
    rotation: child.rotation || 0,
    'blend-mode': child.blendMode || 'normal',
    fills: convertFillsToPenpot(child.fills),
    strokes: convertStrokesToPenpot(child.strokes),
  };
}

/**
 * Build a PenPot shape object from a Kizu child node
 * @param {object} child - Kizu child node
 * @param {string} childId - Shape ID
 * @param {string} shapeFrameId - Containing frame ID
 * @param {string} shapeParentId - Parent ID
 * @returns {object} PenPot shape object
 */
function buildShape(child, childId, shapeFrameId, shapeParentId) {
  const posX = child.x || 0;
  const posY = child.y || 0;
  const width = child.width || 100;
  const height = child.height || 100;

  const shape = {
    id: childId,
    type: child.type || 'rect',
    name: child.name || 'Unnamed',
    'frame-id': shapeFrameId,
    'parent-id': shapeParentId,
    x: posX,
    y: posY,
    width,
    height,
    ...buildGeometry(posX, posY, width, height),
    ...extractDisplayProps(child),
    shapes: [],
  };

  if (child.strokeWeight) {
    shape['stroke-weight'] = child.strokeWeight;
  }
  if (child.effects) {
    shape.effects = child.effects;
  }

  return shape;
}

/**
 * Recursively flatten children into PenPot's flat objects structure
 * @param {array} children - Nested child objects
 * @param {object} objects - Flat objects map to populate
 * @param {string} frameId - Containing frame ID
 * @param {string} parentId - Direct parent ID
 * @returns {array} Array of child IDs
 */
function flattenChildren(children, objects, frameId, parentId) {
  const childIds = [];

  children.forEach((child) => {
    const childId = child.id || crypto.randomUUID();
    childIds.push(childId);

    const isFrame = child.type === 'frame' || child.type === 'component';
    const shapeFrameId = isFrame ? childId : frameId;
    const shapeParentId = parentId;

    objects[childId] = buildShape(child, childId, shapeFrameId, shapeParentId);

    if (child.children && child.children.length > 0) {
      const nested = flattenChildren(child.children, objects, shapeFrameId, childId);
      objects[childId].shapes = nested;
    }

    if (child.type === 'path' && child.commands) {
      objects[childId].content = convertPathCommands(child.commands);
    }
  });

  return childIds;
}

/**
 * Build a PenPot page from a Kizu page
 * @param {object} page - Kizu page object
 * @returns {object} { pageId, pageData }
 */
function buildPenpotPage(page) {
  const pageId = page.id || crypto.randomUUID();
  const pageObjects = {};
  const rootUuid = ROOT_FRAME_ID;

  let childIds = [];
  if (page.children && page.children.length > 0) {
    childIds = flattenChildren(page.children, pageObjects, rootUuid, rootUuid);
  }

  pageObjects[rootUuid] = {
    id: rootUuid,
    type: 'frame',
    name: 'Root Frame',
    'frame-id': rootUuid,
    'parent-id': rootUuid,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...buildGeometry(0, 0, 1, 1),
    visible: true,
    opacity: 1,
    rotation: 0,
    'blend-mode': 'normal',
    fills: [],
    strokes: [],
    shapes: childIds,
  };

  return {
    pageId,
    pageData: {
      id: pageId,
      name: page.name || 'Untitled Page',
      objects: pageObjects,
    },
  };
}

/**
 * Convert Kizu project format to PenPot file format
 * @param {object} kizuProject - Kizu project structure
 * @returns {object} PenPot file structure
 */
function convertKizuToPenpotFile(kizuProject) {
  const pagesArray = [];
  const pagesIndex = {};

  if (kizuProject.data && kizuProject.data.pages) {
    kizuProject.data.pages.forEach((page) => {
      const { pageId, pageData } = buildPenpotPage(page);
      pagesArray.push(pageId);
      pagesIndex[pageId] = pageData;
    });
  }

  return {
    id: kizuProject.metadata.id,
    name: kizuProject.metadata.name,
    'project-id': 'kizu-local',
    version: 22,
    revn: 0,
    'created-at': kizuProject.metadata.created,
    'modified-at': kizuProject.metadata.modified,
    features: ['fdata/shape-data-type', 'components/v2'],
    data: {
      pages: pagesArray,
      'pages-index': pagesIndex,
      options: { 'components-v2': true, 'base-font-size': '16px' },
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

/**
 * Build test page objects for hardcoded test file
 * @returns {object} Objects map with root frame and test frame
 */
function buildTestPageObjects() {
  return {
    [ROOT_FRAME_ID]: {
      id: ROOT_FRAME_ID,
      type: 'frame',
      name: 'Root Frame',
      'frame-id': ROOT_FRAME_ID,
      'parent-id': ROOT_FRAME_ID,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      ...buildGeometry(0, 0, 1, 1),
      shapes: [TEST_FRAME_ID],
    },
    [TEST_FRAME_ID]: {
      id: TEST_FRAME_ID,
      type: 'frame',
      name: 'Test Frame - Backend Works!',
      'frame-id': ROOT_FRAME_ID,
      'parent-id': ROOT_FRAME_ID,
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      ...buildGeometry(100, 100, 400, 300),
      fills: [{ 'fill-color': '#3388ff', 'fill-opacity': 1 }],
      shapes: [],
    },
  };
}

/**
 * Creates a minimal valid PenPot file for backend integration testing
 * @returns {object} Hardcoded PenPot file structure
 */
function createHardcodedTestFile() {
  const now = new Date().toISOString();
  return {
    id: TEST_FILE_ID,
    name: 'Hardcoded Test File',
    'project-id': TEST_FILE_ID,
    'team-id': KIZU_TEAM_ID,
    version: 22,
    revn: 0,
    'created-at': now,
    'modified-at': now,
    features: ['fdata/shape-data-type', 'components/v2'],
    data: {
      pages: [TEST_PAGE_ID],
      'pages-index': {
        [TEST_PAGE_ID]: {
          id: TEST_PAGE_ID,
          name: 'Test Page',
          options: {},
          objects: buildTestPageObjects(),
        },
      },
      options: { 'components-v2': true },
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

module.exports = {
  convertKizuToPenpotFile,
  createHardcodedTestFile,
  flattenChildren,
  convertFillsToPenpot,
  convertStrokesToPenpot,
  convertPathCommands,
  TEST_FILE_ID,
};
