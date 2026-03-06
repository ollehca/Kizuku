/**
 * Kizuku Override Resolver
 * Resolves Figma component instance overrides and applies them
 * to converted child nodes.
 *
 * Figma stores overrides as arrays of { id, overriddenFields }
 * where id targets a specific child node in the component tree.
 */

/** Map override field to PenPot touch group */
const TOUCH_GROUP_MAP = {
  visible: 'visibility-group',
  opacity: 'layer-effects-group',
  fills: 'fill-group',
  characters: 'content-group',
  name: 'name-group',
  strokes: 'stroke-group',
  cornerRadius: 'geometry-group',
  width: 'size-group',
  height: 'size-group',
  rotation: 'rotation-group',
  blendMode: 'layer-effects-group',
  effects: 'shadow-group',
};

/**
 * Resolve and apply overrides to converted instance children.
 * Returns a Set of touched group names for PenPot sync.
 * @param {object} instance - Converted instance node
 * @param {object} figmaNode - Original Figma instance node
 * @param {Function} idMapper - Maps Figma IDs to UUIDs
 * @returns {Set<string>} Set of touched group names
 */
function resolveOverrides(instance, figmaNode, idMapper) {
  const touched = new Set();
  if (!figmaNode.overrides || figmaNode.overrides.length === 0) {
    return touched;
  }
  if (!instance.children || instance.children.length === 0) {
    return touched;
  }
  for (const override of figmaNode.overrides) {
    collectTouchedGroups(override, touched);
    const mapped = mapOverrideId(override, idMapper);
    applyOverrideToTree(instance.children, mapped);
  }
  return touched;
}

/** Translate override ID segments through the UUID mapper */
function mapOverrideId(override, idMapper) {
  if (!idMapper || !override.id) {
    return override;
  }
  const rawId = String(override.id);
  const mappedId = rawId.includes(';') ? rawId.split(';').map(idMapper).join(';') : idMapper(rawId);
  return { ...override, id: mappedId };
}

/**
 * Collect touched group names from an override descriptor.
 * @param {object} override - Override descriptor
 * @param {Set} touched - Set to add group names to
 */
function collectTouchedGroups(override, touched) {
  if (!override.overriddenFields) {
    return;
  }
  for (const key of Object.keys(override.overriddenFields)) {
    const group = TOUCH_GROUP_MAP[key];
    if (group) {
      touched.add(group);
    }
  }
}

/**
 * Apply a single override to the children tree.
 * @param {array} children - Array of converted children
 * @param {object} override - Override descriptor
 */
function applyOverrideToTree(children, override) {
  if (!override.id || !override.overriddenFields) {
    return;
  }
  const target = findChildByIdOrPath(children, override.id);
  if (!target) {
    return;
  }
  applyOverrideToNode(target, override.overriddenFields);
}

/**
 * Find a child by direct ID match, or by path-based ID (id1;id2).
 * Figma encodes nested overrides with semicolons.
 * @param {array} children - Children to search
 * @param {string} targetId - ID or path-based ID
 * @returns {object|null} Found node or null
 */
function findChildByIdOrPath(children, targetId) {
  const direct = findChildById(children, targetId);
  if (direct) {
    return direct;
  }
  if (!targetId.includes(';')) {
    return null;
  }
  const segments = targetId.split(';');
  return walkPathSegments(children, segments);
}

/** Walk path segments to find deeply nested override target */
function walkPathSegments(children, segments) {
  let current = children;
  for (let idx = 0; idx < segments.length; idx++) {
    const node = findChildById(current, segments[idx]);
    if (!node) {
      return null;
    }
    if (idx === segments.length - 1) {
      return node;
    }
    current = node.children || [];
  }
  return null;
}

/**
 * Apply overridden field values to a target node.
 * @param {object} node - Target converted node
 * @param {object} fields - Override field values
 */
function applyOverrideToNode(node, fields) {
  for (const [key, value] of Object.entries(fields)) {
    applyFieldOverride(node, key, value);
  }
}

/**
 * Apply a single field override to a node.
 * @param {object} node - Target node
 * @param {string} key - Field key
 * @param {*} value - Override value
 */
function applyFieldOverride(node, key, value) {
  const fieldMap = {
    visible: () => applyVisibility(node, value),
    opacity: () => applyOpacity(node, value),
    fills: () => applyFills(node, value),
    strokes: () => applyArrayField(node, 'strokes', value),
    effects: () => applyArrayField(node, 'effects', value),
    characters: () => applyText(node, value),
    name: () => applyName(node, value),
    cornerRadius: () => applyCornerRadius(node, value),
    width: () => applyDimension(node, 'width', value),
    height: () => applyDimension(node, 'height', value),
    rotation: () => applyNumericField(node, 'rotation', value),
    blendMode: () => applyBlendMode(node, value),
  };
  const handler = fieldMap[key];
  if (handler) {
    handler();
  } else {
    node[key] = value;
  }
}

/**
 * Apply visibility override
 * @param {object} node - Target node
 * @param {boolean} visible - Visibility value
 */
function applyVisibility(node, visible) {
  node.visible = visible !== false;
}

/**
 * Apply opacity override
 * @param {object} node - Target node
 * @param {number} opacity - Opacity 0-1
 */
function applyOpacity(node, opacity) {
  node.opacity = opacity ?? 1;
}

/**
 * Apply fill override
 * @param {object} node - Target node
 * @param {array} fills - New fill array
 */
function applyFills(node, fills) {
  if (Array.isArray(fills)) {
    node.fills = fills;
  }
}

/**
 * Apply text override
 * @param {object} node - Target node
 * @param {string} text - New text content
 */
function applyText(node, text) {
  if (typeof text === 'string') {
    node.characters = text;
  }
}

/**
 * Apply name override
 * @param {object} node - Target node
 * @param {string} name - New name
 */
function applyName(node, name) {
  if (typeof name === 'string') {
    node.name = name;
  }
}

/**
 * Apply an array field override (strokes, effects)
 * @param {object} node - Target node
 * @param {string} field - Field name
 * @param {*} value - Override value
 */
function applyArrayField(node, field, value) {
  if (Array.isArray(value)) {
    node[field] = value;
  }
}

/**
 * Apply corner radius override with per-corner support
 * @param {object} node - Target node
 * @param {*} value - Radius value (number or object with corners)
 */
function applyCornerRadius(node, value) {
  if (typeof value === 'number') {
    node.cornerRadius = value;
    node.cornerRadii = {
      topLeft: value,
      topRight: value,
      bottomRight: value,
      bottomLeft: value,
    };
  } else if (typeof value === 'object' && value !== null) {
    node.cornerRadii = value;
    node.cornerRadius = value.topLeft || 0;
  }
}

/**
 * Apply dimension override (width or height)
 * @param {object} node - Target node
 * @param {string} field - 'width' or 'height'
 * @param {number} value - New dimension value
 */
function applyDimension(node, field, value) {
  if (typeof value === 'number' && value >= 0) {
    node[field] = value;
  }
}

/**
 * Apply a numeric field override (rotation, etc.)
 * @param {object} node - Target node
 * @param {string} field - Field name
 * @param {number} value - Override value
 */
function applyNumericField(node, field, value) {
  if (typeof value === 'number') {
    node[field] = value;
  }
}

/**
 * Apply blend mode override
 * @param {object} node - Target node
 * @param {string} value - Blend mode string
 */
function applyBlendMode(node, value) {
  if (typeof value === 'string') {
    node.blendMode = value;
  }
}

/**
 * Find a child node by ID, searching recursively.
 * @param {array} children - Children to search
 * @param {string} targetId - ID to find
 * @returns {object|null} Found node or null
 */
function findChildById(children, targetId) {
  for (const child of children) {
    if (child.id === targetId) {
      return child;
    }
    if (child.children && child.children.length > 0) {
      const found = findChildById(child.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Resolve component property references on an instance.
 * Copies resolved property values from componentProperties
 * to the appropriate fields.
 * @param {object} instance - Converted instance node
 * @param {object} figmaNode - Original Figma node
 * @returns {object} Instance with resolved properties
 */
function resolveComponentProperties(instance, figmaNode) {
  const refs = figmaNode.componentPropertyReferences;
  const props = figmaNode.componentProperties;
  if (refs && props) {
    for (const [field, propKey] of Object.entries(refs)) {
      const propDef = props[propKey];
      if (propDef && propDef.value !== undefined) {
        applyTypedProperty(instance, field, propDef);
      }
    }
  }
  attachSwapComponent(instance, figmaNode);
  return instance;
}

/**
 * Apply a typed component property value.
 * Validates BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT types.
 * @param {object} node - Target node
 * @param {string} field - Field name
 * @param {object} propDef - Property definition { type, value }
 */
function applyTypedProperty(node, field, propDef) {
  const { type, value } = propDef;
  if (type === 'BOOLEAN') {
    applyFieldOverride(node, field, value === true || value === 'true');
    return;
  }
  if (type === 'INSTANCE_SWAP') {
    node.swappedComponentId = value;
    return;
  }
  applyFieldOverride(node, field, value);
}

/**
 * Attach swappable component ID if present
 * @param {object} instance - Converted instance node
 * @param {object} figmaNode - Source Figma node
 */
function attachSwapComponent(instance, figmaNode) {
  if (figmaNode.swappableComponentId) {
    instance.swappedComponentId = figmaNode.swappableComponentId;
  }
}

module.exports = {
  resolveOverrides,
  resolveComponentProperties,
  findChildById,
};
