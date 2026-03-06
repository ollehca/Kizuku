/** Converts Kizuku nested format to PenPot flat file structure. */
const crypto = require('node:crypto');
const geometry = require('./kizuku-penpot-geometry');
const shapes = require('./kizuku-penpot-shape-builder');
const images = require('./kizuku-penpot-image-builder');
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

/** Map Kizuku type to PenPot type */
function mapShapeType(kizukuType) {
  const typeMap = {
    component: 'frame',
    'component-set': 'frame',
    instance: 'frame',
  };
  return typeMap[kizukuType] || kizukuType;
}

/** Resolve absolute page position for a PenPot shape */
function resolveShapePosition(child, absPos) {
  if (absPos) {
    return { x: absPos.x, y: absPos.y };
  }
  return { x: child.x || 0, y: child.y || 0 };
}

/** Maps component ID → ordered tree of child PenPot IDs for shape-ref */
const componentChildMap = new Map();

/** Attach mask and flip flags to shape */
function attachMaskFlip(child, shape) {
  if (child.isMaskedGroup) {
    shape['masked-group'] = true;
  }
  if (child.flipH || child.flipV) {
    shape.flip = { x: child.flipH || false, y: child.flipV || false };
  }
}

/** Build a PenPot shape from a Kizuku child node */
function buildShape(child, childId, shapeFrameId, shapeParentId, absPos) {
  const { x: geoX, y: geoY } = resolveShapePosition(child, absPos);
  const width = child.width || 100;
  const height = child.height || 100;
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
    ...geometry.buildAffineGeometry(geoX, geoY, width, height, child),
    ...shapes.extractDisplayProps(child),
    fills: shapes.convertFillsToPenpot(child.fills),
    strokes: shapes.convertStrokesToPenpot(child.strokes, child.strokeWeight),
    shapes: [],
  };

  attachMaskFlip(child, shape);
  attachTypeSpecificProps(child, shape, absPos);
  attachEffectProps(child, shape);
  attachLayoutProps(child, shape);

  return shape;
}

/** Attach type-specific properties to shape */
function attachTypeSpecificProps(child, shape, absPos) {
  attachPathProps(child, shape, absPos);
  attachTextProps(child, shape);
  attachComponentProps(child, shape);
  if (child.type === 'rect') {
    Object.assign(shape, shapes.convertCornerRadius(child));
  }
  attachClipProps(child, shape);
  if (child.constraints) {
    Object.assign(shape, shapes.convertConstraints(child.constraints));
  }
  attachStyleTokens(child, shape);
  attachExportSettings(child, shape);
}

/** Attach path-specific properties with absolute position offset */
function attachPathProps(child, shape, absPos) {
  if (child.type === 'path' && child.commands) {
    shape.content = shapes.convertPathContent(child, absPos);
    if (child.fillRule) {
      shape['fill-rule'] = child.fillRule;
    }
  }
}

/** Attach text-specific properties */
function attachTextProps(child, shape) {
  if (child.type === 'text' && child.content) {
    shape.content = child.content;
    shape['grow-type'] = child.content?.['grow-type'] || 'fixed';
  }
}

/** Attach component-specific properties */
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
    shape['shape-ref'] = child.componentId;
  }
  if (child.swappedComponentId) {
    shape['component-id'] = child.swappedComponentId;
  }
  attachVariantAttrs(child, shape);
  attachTouchedSet(child, shape);
  if (child.mainInstance) {
    shape['main-instance'] = true;
  }
}

/** Attach variant attributes to PenPot shape */
function attachVariantAttrs(child, shape) {
  if (child.isVariantContainer) {
    shape['is-variant-container'] = true;
  }
  if (child.variantId) {
    shape['variant-id'] = child.variantId;
  }
  if (child.variantName) {
    shape['variant-name'] = child.variantName;
  }
  if (child.variantProperties) {
    shape['variant-properties'] = child.variantProperties;
  }
}

/** Attach touched set from override tracking */
function attachTouchedSet(child, shape) {
  if (!child.touched) {
    return;
  }
  const touchedArray = child.touched instanceof Set ? Array.from(child.touched) : child.touched;
  if (touchedArray.length > 0) {
    shape.touched = new Set(touchedArray);
  }
}

/** Attach clip content properties */
function attachClipProps(child, shape) {
  if (child.clipContent === true) {
    shape['show-content'] = false;
  } else if (shape.type === 'frame' || shape.type === 'group') {
    shape['show-content'] = true;
  }
}

/** Figma style ref keys to PenPot token key mapping */
const STYLE_TOKEN_MAP = [
  [['fill', 'fills'], 'fill'],
  [['stroke', 'strokes'], 'stroke'],
  [['text'], 'font-family'],
  [['effect'], 'shadow'],
];

/** Build token map from Figma style refs */
function buildTokenMap(refs) {
  const tokens = {};
  for (const [srcKeys, dstKey] of STYLE_TOKEN_MAP) {
    const val = srcKeys.find((key) => refs[key]);
    if (val) {
      tokens[dstKey] = refs[val];
    }
  }
  return tokens;
}

/** Map Figma style refs to PenPot applied-tokens */
function attachStyleTokens(child, shape) {
  const refs = child.styleRefs;
  if (!refs || typeof refs !== 'object') {
    return;
  }
  const tokens = buildTokenMap(refs);
  if (Object.keys(tokens).length > 0) {
    shape['applied-tokens'] = tokens;
  }
}

/** Attach export settings to PenPot shape */
function attachExportSettings(child, shape) {
  if (!Array.isArray(child.exportSettings) || child.exportSettings.length === 0) {
    return;
  }
  shape.exports = child.exportSettings.map((exp) => ({
    type: (exp.format || 'png').toLowerCase(),
    suffix: exp.suffix || '',
    scale: exp.constraint?.value || 1,
  }));
}

/** Attach effect properties (shadows, blur) to shape */
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

/** Attach layout properties to shape */
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

/** Build recursive tree of child IDs for component shape-ref mapping */
function collectChildTree(childIds, objects) {
  return childIds.map((cid) => {
    const sub = objects[cid]?.shapes || [];
    return { id: cid, sub: collectChildTree(sub, objects) };
  });
}

/** Apply shape-ref from component child tree to instance children */
function applyShapeRefs(childIds, objects, refTree) {
  if (!refTree) {
    return;
  }
  const len = Math.min(childIds.length, refTree.length);
  for (let idx = 0; idx < len; idx++) {
    const obj = objects[childIds[idx]];
    if (obj) {
      obj['shape-ref'] = refTree[idx].id;
      applyShapeRefs(obj.shapes || [], objects, refTree[idx].sub);
    }
  }
}

/**
 * Recursively flatten children into PenPot's flat objects structure
 * @param {array} children - Child nodes to flatten
 * @param {object} objects - Flat objects accumulator
 * @param {object} ctx - Context { frameId, parentId, absPos, parentTransform }
 * @returns {array} Array of child IDs
 */
function flattenChildren(children, objects, ctx) {
  const childIds = [];
  const origin = ctx.absPos || { x: 0, y: 0 };

  children.forEach((child) => {
    const childId = child.id || crypto.randomUUID();
    childIds.push(childId);

    const isContainer = CONTAINER_TYPES.has(child.type);
    const childFrameId = isContainer ? childId : ctx.frameId;
    const childAbs = geometry.transformChildPosition(
      origin,
      child.x || 0,
      child.y || 0,
      ctx.parentTransform
    );

    objects[childId] = buildShape(child, childId, childFrameId, ctx.parentId, childAbs);

    if (child.children && child.children.length > 0) {
      const nested = flattenChildren(child.children, objects, {
        frameId: childFrameId,
        parentId: childId,
        absPos: childAbs,
        parentTransform: child.relativeTransform,
      });
      objects[childId].shapes = nested;
    }

    registerOrApplyShapeRefs(child, childId, objects);
  });

  return childIds;
}

/** Register component child tree or apply shape-refs for instances */
function registerOrApplyShapeRefs(child, childId, objects) {
  const childType = child.type;
  if (childType === 'component' || childType === 'component-set') {
    const tree = collectChildTree(objects[childId].shapes || [], objects);
    componentChildMap.set(childId, tree);
  }
  if (childType === 'instance' && child.componentId) {
    const refTree = componentChildMap.get(child.componentId);
    applyShapeRefs(objects[childId].shapes || [], objects, refTree);
  }
}

/** Build a PenPot page from a Kizuku page */
function buildPenpotPage(page) {
  const pageId = page.id || crypto.randomUUID();
  const pageObjects = {};
  const rootUuid = ROOT_FRAME_ID;

  let childIds = [];
  if (page.children && page.children.length > 0) {
    childIds = flattenChildren(page.children, pageObjects, {
      frameId: rootUuid,
      parentId: rootUuid,
    });
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

/** Build the root frame object for a page */
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

/** Scan pages for component shapes and build PenPot components map */
function buildComponentsMap(pagesArray, pagesIndex) {
  const components = {};
  for (const pageId of pagesArray) {
    const objects = pagesIndex[pageId]?.objects || {};
    for (const shape of Object.values(objects)) {
      if (shape['component-root'] && shape['component-id']) {
        components[shape['component-id']] = {
          id: shape['component-id'],
          name: shape.name || 'Component',
          path: '',
          'main-instance-page': pageId,
          'main-instance-id': shape.id,
        };
      }
    }
  }
  return components;
}
/** Build PenPot colors map from Kizuku color library */
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
/** Build a single PenPot typography entry */
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

/** Build PenPot typographies map from Kizuku typography library */
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
/** Convert Kizuku project format to PenPot file format */
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
  const media = images.buildMediaMap(kizukuProject.assets?.images);
  const colors = buildColorsMap(kizukuProject.data?.colorLibrary);
  const typographies = buildTypographiesMap(kizukuProject.data?.typographyLibrary);
  const components = buildComponentsMap(pagesArray, pagesIndex);

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
      components,
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
