/**
 * Kizu to PenPot Format Converter
 * Converts Kizu's nested project format to PenPot's flat file structure.
 * Delegates property conversion to shape-builder and geometry modules.
 */

const crypto = require('crypto');
const geometry = require('./kizu-penpot-geometry');
const shapes = require('./kizu-penpot-shape-builder');

const KIZU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const TEST_FILE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PAGE_ID = '22222222-2222-2222-2222-222222222222';
const TEST_FRAME_ID = '33333333-3333-3333-3333-333333333333';
const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';

/** Container types that have children in PenPot */
const CONTAINER_TYPES = new Set([
  'frame',
  'group',
  'component',
  'component-set',
  'bool',
  'instance',
]);

/**
 * Map Kizu type to PenPot type
 * @param {string} kizuType - Kizu node type
 * @returns {string} PenPot shape type
 */
function mapShapeType(kizuType) {
  const typeMap = {
    component: 'frame',
    'component-set': 'frame',
    instance: 'frame',
  };
  return typeMap[kizuType] || kizuType;
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
  const rotation = child.rotation || 0;

  const shape = {
    id: childId,
    type: mapShapeType(child.type || 'rect'),
    name: child.name || 'Unnamed',
    'frame-id': shapeFrameId,
    'parent-id': shapeParentId,
    x: posX,
    y: posY,
    width,
    height,
    ...geometry.buildGeometry(posX, posY, width, height, rotation),
    ...shapes.extractDisplayProps(child),
    fills: shapes.convertFillsToPenpot(child.fills),
    strokes: shapes.convertStrokesToPenpot(child.strokes, child.strokeWeight),
    shapes: [],
  };

  attachTypeSpecificProps(child, shape);
  attachEffectProps(child, shape);
  attachLayoutProps(child, shape);

  return shape;
}

/**
 * Attach type-specific properties to shape
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachTypeSpecificProps(child, shape) {
  attachPathProps(child, shape);
  attachTextProps(child, shape);
  attachComponentProps(child, shape);
  attachRectProps(child, shape);
  attachClipProps(child, shape);
  attachConstraintProps(child, shape);
}

/**
 * Attach path-specific properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachPathProps(child, shape) {
  if (child.type === 'path' && child.commands) {
    shape.content = shapes.convertPathContent(child);
  }
}

/**
 * Attach text-specific properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachTextProps(child, shape) {
  if (child.type === 'text' && child.content) {
    shape.content = child.content;
    shape['grow-type'] = child.content?.['grow-type'] || 'fixed';
  }
}

/**
 * Attach component-specific properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachComponentProps(child, shape) {
  if (child.type === 'bool' && child.boolType) {
    shape['bool-type'] = child.boolType;
  }
  if (child.type === 'instance' && child.componentId) {
    shape['component-id'] = child.componentId;
  }
}

/**
 * Attach rectangle-specific properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachRectProps(child, shape) {
  if (child.type === 'rect') {
    Object.assign(shape, shapes.convertCornerRadius(child));
  }
}

/**
 * Attach clip content properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachClipProps(child, shape) {
  if (child.clipContent !== null && child.clipContent !== undefined) {
    shape['show-content'] = !child.clipContent;
  }
}

/**
 * Attach constraint properties
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachConstraintProps(child, shape) {
  if (child.constraints) {
    Object.assign(shape, shapes.convertConstraints(child.constraints));
  }
}

/**
 * Attach effect properties (shadows, blur) to shape
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachEffectProps(child, shape) {
  if (!child.effects || child.effects.length === 0) {
    return;
  }
  const { shadow, blur } = shapes.convertEffectsToPenpot(child.effects);
  if (shadow.length > 0) {
    shape.shadow = shadow;
  }
  if (blur) {
    shape.blur = blur;
  }
}

/**
 * Attach layout properties to shape
 * @param {object} child - Kizu node
 * @param {object} shape - PenPot shape to extend
 */
function attachLayoutProps(child, shape) {
  if (child.layout) {
    const layoutProps = shapes.convertLayoutToPenpot(child.layout);
    Object.assign(shape, layoutProps);
  }
  if (child.layoutChild) {
    const childProps = shapes.convertLayoutChildToPenpot(child.layoutChild);
    Object.assign(shape, childProps);
  }
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

    const isContainer = CONTAINER_TYPES.has(child.type);
    const shapeFrameId = isContainer ? childId : frameId;

    objects[childId] = buildShape(child, childId, shapeFrameId, parentId);

    if (child.children && child.children.length > 0) {
      const nested = flattenChildren(child.children, objects, shapeFrameId, childId);
      objects[childId].shapes = nested;
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

  pageObjects[rootUuid] = buildRootFrame(rootUuid, childIds);

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
 * Build the root frame object for a page
 * @param {string} rootId - Root frame ID
 * @param {array} childIds - Direct child IDs
 * @returns {object} PenPot root frame
 */
function buildRootFrame(rootId, childIds) {
  return {
    id: rootId,
    type: 'frame',
    name: 'Root Frame',
    'frame-id': rootId,
    'parent-id': rootId,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...geometry.buildGeometry(0, 0, 1, 1, 0),
    visible: true,
    opacity: 1,
    rotation: 0,
    'blend-mode': 'normal',
    fills: [],
    strokes: [],
    shapes: childIds,
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
      ...geometry.buildGeometry(0, 0, 1, 1, 0),
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
      ...geometry.buildGeometry(100, 100, 400, 300, 0),
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
  convertFillsToPenpot: shapes.convertFillsToPenpot,
  convertStrokesToPenpot: shapes.convertStrokesToPenpot,
  convertPathCommands: (cmds) => shapes.convertPathSegments(cmds),
  TEST_FILE_ID,
};
