/**
 * Kizuku to PenPot Format Converter
 * Converts Kizuku's nested project format to PenPot's flat file structure.
 * Delegates property conversion to shape-builder and geometry modules.
 */

const crypto = require('node:crypto');
const geometry = require('./kizuku-penpot-geometry');
const shapes = require('./kizuku-penpot-shape-builder');
const testFile = require('./kizuku-penpot-test-file');

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
 * Map Kizuku type to PenPot type
 * @param {string} kizukuType - Kizuku node type
 * @returns {string} PenPot shape type
 */
function mapShapeType(kizukuType) {
  const typeMap = {
    component: 'frame',
    'component-set': 'frame',
    instance: 'frame',
  };
  return typeMap[kizukuType] || kizukuType;
}

/**
 * Build a PenPot shape object from a Kizuku child node
 * @param {object} child - Kizuku child node
 * @param {string} childId - Shape ID
 * @param {string} shapeFrameId - Containing frame ID
 * @param {string} shapeParentId - Parent ID
 * @param {object} absPos - Absolute page position { x, y }
 * @returns {object} PenPot shape object
 */
/**
 * Resolve absolute page position for a PenPot shape
 * PenPot flat structure requires all shapes use absolute coords
 * @param {object} child - Kizuku node
 * @param {object} absPos - Absolute page position
 * @returns {object} { x, y } absolute position for PenPot shape
 */
function resolveShapePosition(child, absPos) {
  if (absPos) {
    return { x: absPos.x, y: absPos.y };
  }
  return { x: child.x || 0, y: child.y || 0 };
}

function buildShape(child, childId, shapeFrameId, shapeParentId, absPos) {
  const { x: geoX, y: geoY } = resolveShapePosition(child, absPos);
  const width = child.width || 100;
  const height = child.height || 100;
  const rotation = child.rotation || 0;

  const shape = {
    id: childId,
    type: mapShapeType(child.type || 'rect'),
    name: child.name || 'Unnamed',
    'frame-id': shapeFrameId,
    'parent-id': shapeParentId,
    x: geoX,
    y: geoY,
    width,
    height,
    ...geometry.buildGeometry(geoX, geoY, width, height, rotation),
    ...shapes.extractDisplayProps(child),
    fills: shapes.convertFillsToPenpot(child.fills),
    strokes: shapes.convertStrokesToPenpot(child.strokes, child.strokeWeight),
    shapes: [],
  };

  attachTypeSpecificProps(child, shape, absPos);
  attachEffectProps(child, shape);
  attachLayoutProps(child, shape);

  return shape;
}

/**
 * Attach type-specific properties to shape
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 * @param {object} absPos - Absolute page position { x, y }
 */
function attachTypeSpecificProps(child, shape, absPos) {
  attachPathProps(child, shape, absPos);
  attachTextProps(child, shape);
  attachComponentProps(child, shape);
  attachRectProps(child, shape);
  attachClipProps(child, shape);
  attachConstraintProps(child, shape);
}

/**
 * Attach path-specific properties with absolute position offset
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 * @param {object} absPos - Absolute page position { x, y }
 */
function attachPathProps(child, shape, absPos) {
  if (child.type === 'path' && child.commands) {
    shape.content = shapes.convertPathContent(child, absPos);
    if (child.fillRule) {
      shape['fill-rule'] = child.fillRule;
    }
  }
}

/**
 * Attach text-specific properties
 * @param {object} child - Kizuku node
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
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 */
function attachComponentProps(child, shape) {
  if (child.type === 'bool' && child.boolType) {
    shape['bool-type'] = child.boolType;
  }
  if (child.type === 'component' || child.type === 'component-set') {
    shape['component-root'] = true;
    shape['component-id'] = child.id;
    shape['component-file'] = 'local';
  }
  if (child.type === 'instance' && child.componentId) {
    shape['component-id'] = child.componentId;
    shape['component-file'] = 'local';
  }
}

/**
 * Attach rectangle-specific properties
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 */
function attachRectProps(child, shape) {
  if (child.type === 'rect') {
    Object.assign(shape, shapes.convertCornerRadius(child));
  }
}

/**
 * Attach clip content properties
 * Frames with no fills default to show-content to avoid black bg
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 */
function attachClipProps(child, shape) {
  if (child.clipContent === true) {
    shape['show-content'] = false;
  } else if (shape.type === 'frame' || shape.type === 'group') {
    shape['show-content'] = true;
  }
}

/**
 * Attach constraint properties
 * @param {object} child - Kizuku node
 * @param {object} shape - PenPot shape to extend
 */
function attachConstraintProps(child, shape) {
  if (child.constraints) {
    Object.assign(shape, shapes.convertConstraints(child.constraints));
  }
}

/**
 * Attach effect properties (shadows, blur) to shape
 * @param {object} child - Kizuku node
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
 * @param {object} child - Kizuku node
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
 * @param {object} absPos - Accumulated absolute position { x, y }
 * @returns {array} Array of child IDs
 */
function flattenChildren(children, objects, frameId, parentId, absPos) {
  const childIds = [];
  const origin = absPos || { x: 0, y: 0 };

  children.forEach((child) => {
    const childId = child.id || crypto.randomUUID();
    childIds.push(childId);

    const isContainer = CONTAINER_TYPES.has(child.type);
    const childFrameId = isContainer ? childId : frameId;
    const childAbs = {
      x: origin.x + (child.x || 0),
      y: origin.y + (child.y || 0),
    };

    objects[childId] = buildShape(child, childId, childFrameId, parentId, childAbs);

    if (child.children && child.children.length > 0) {
      const nested = flattenChildren(child.children, objects, childFrameId, childId, childAbs);
      objects[childId].shapes = nested;
    }
  });

  return childIds;
}

/**
 * Build a PenPot page from a Kizuku page
 * @param {object} page - Kizuku page object
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
 * Build PenPot colors map from Kizuku color library
 * @param {array} colorLibrary - Kizuku color library entries
 * @returns {object} Colors map keyed by ID
 */
function buildColorsMap(colorLibrary) {
  if (!Array.isArray(colorLibrary) || colorLibrary.length === 0) {
    return {};
  }
  const colors = {};
  for (const entry of colorLibrary) {
    if (entry.id && entry.color) {
      colors[entry.id] = {
        id: entry.id,
        name: entry.name || 'Unnamed',
        color: entry.color,
        opacity: 1,
      };
    }
  }
  return colors;
}

/**
 * Build a single PenPot typography entry from font properties
 * @param {object} entry - Kizuku typography entry
 * @returns {object} PenPot typography object
 */
function buildTypographyEntry(entry) {
  const fontProps = entry.fontProps || {};
  return {
    id: entry.id,
    name: entry.name || 'Unnamed',
    'font-family': fontProps.fontFamily || 'Arial',
    'font-size': String(fontProps.fontSize || 16),
    'font-weight': String(fontProps.fontWeight || 400),
    'font-style': fontProps.italic ? 'italic' : 'normal',
    'line-height': String(fontProps.lineHeightPx || '1.2'),
    'letter-spacing': String(fontProps.letterSpacing || 0),
  };
}

/**
 * Build PenPot typographies map from Kizuku typography library
 * @param {array} typographyLibrary - Kizuku typography library entries
 * @returns {object} Typographies map keyed by ID
 */
function buildTypographiesMap(typographyLibrary) {
  if (!Array.isArray(typographyLibrary) || typographyLibrary.length === 0) {
    return {};
  }
  const typographies = {};
  for (const entry of typographyLibrary) {
    if (entry.id) {
      typographies[entry.id] = buildTypographyEntry(entry);
    }
  }
  return typographies;
}

/**
 * Build PenPot media map from extracted images
 * @param {array} images - Array of { hash, data } image objects
 * @returns {object} Media map keyed by hash
 */
function buildMediaMap(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return {};
  }
  const media = {};
  for (const img of images) {
    if (img.hash && img.data) {
      media[img.hash] = {
        id: img.hash,
        name: img.name || img.hash,
        mtype: img.mtype || 'image/png',
        width: img.width || 0,
        height: img.height || 0,
        data: img.data,
      };
    }
  }
  return media;
}

/**
 * Convert Kizuku project format to PenPot file format
 * @param {object} kizukuProject - Kizuku project structure
 * @returns {object} PenPot file structure
 */
function convertKizukuToPenpotFile(kizukuProject) {
  const pagesArray = [];
  const pagesIndex = {};

  // Build image lookup so fills can embed data URIs
  shapes.setImageAssets(kizukuProject.assets?.images || []);

  if (kizukuProject.data?.pages) {
    kizukuProject.data.pages.forEach((page) => {
      const { pageId, pageData } = buildPenpotPage(page);
      pagesArray.push(pageId);
      pagesIndex[pageId] = pageData;
    });
  }

  shapes.setImageAssets([]); // Clear after use
  const media = buildMediaMap(kizukuProject.assets?.images);
  const colors = buildColorsMap(kizukuProject.data?.colorLibrary);
  const typographies = buildTypographiesMap(kizukuProject.data?.typographyLibrary);

  return {
    id: kizukuProject.metadata.id,
    name: kizukuProject.metadata.name,
    'project-id': 'kizu-local',
    version: 22,
    revn: 0,
    'created-at': kizukuProject.metadata.created,
    'modified-at': kizukuProject.metadata.modified,
    features: ['components/v2'],
    data: {
      pages: pagesArray,
      'pages-index': pagesIndex,
      options: { 'components-v2': true, 'base-font-size': '16px' },
      media,
      colors,
      typographies,
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

module.exports = {
  convertKizukuToPenpotFile,
  createHardcodedTestFile: testFile.createHardcodedTestFile,
  flattenChildren,
  convertFillsToPenpot: shapes.convertFillsToPenpot,
  convertStrokesToPenpot: shapes.convertStrokesToPenpot,
  convertPathCommands: (cmds) => shapes.convertPathSegments(cmds),
  TEST_FILE_ID: testFile.TEST_FILE_ID,
};
