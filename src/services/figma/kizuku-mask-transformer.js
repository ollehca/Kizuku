/**
 * Kizuku Mask Transformer
 * Handles Figma mask detection and grouping for PenPot output.
 *
 * Figma: A child with `isMask: true` clips all subsequent siblings
 * until another mask or end of children.
 * PenPot: Uses `masked-group: true` on a group wrapping masked content.
 */

const crypto = require('node:crypto');

/**
 * Check if a children array contains any mask child.
 * @param {array} children - Array of Figma nodes
 * @returns {boolean} True if at least one child has isMask
 */
function hasMaskChild(children) {
  if (!children || children.length === 0) {
    return false;
  }
  return children.some((child) => child.isMask === true);
}

/**
 * Group children into mask groups where applicable.
 * A mask child starts a new mask group. All subsequent siblings
 * are added to that group until another mask or end-of-list.
 *
 * @param {array} children - Array of converted child nodes
 * @returns {array} Children with mask groups inserted
 */
function groupChildrenWithMasks(children) {
  if (!children || children.length === 0) {
    return [];
  }
  if (!hasMaskChild(children)) {
    return children;
  }
  return buildMaskGroupedList(children);
}

/**
 * Build grouped list splitting on mask boundaries.
 * @param {array} children - Array of child nodes
 * @returns {array} Regrouped children
 */
function buildMaskGroupedList(children) {
  const result = [];
  let currentGroup = null;

  for (const child of children) {
    if (child.isMask) {
      currentGroup = flushAndStartGroup(currentGroup, child, result);
    } else if (currentGroup) {
      currentGroup.children.push(child);
    } else {
      result.push(child);
    }
  }
  if (currentGroup) {
    result.push(finalizeMaskGroup(currentGroup));
  }
  return result;
}

/**
 * Flush current group and start a new one with the mask child.
 * @param {object|null} currentGroup - Active group or null
 * @param {object} maskChild - The mask node
 * @param {array} result - Result accumulator
 * @returns {object} New mask group
 */
function flushAndStartGroup(currentGroup, maskChild, result) {
  if (currentGroup) {
    result.push(finalizeMaskGroup(currentGroup));
  }
  return {
    maskNode: maskChild,
    children: [],
  };
}

/**
 * Finalize a mask group into a Kizuku node.
 * @param {object} group - { maskNode, children }
 * @returns {object} Kizuku mask group node
 */
function finalizeMaskGroup(group) {
  const maskNode = group.maskNode;
  const maskName = maskNode.name || 'Mask Group';
  return {
    type: 'MASK_GROUP',
    name: maskName,
    id: `mask-${crypto.randomUUID().slice(0, 8)}`,
    isMaskedGroup: true,
    maskChild: stripMaskFlag(maskNode),
    children: group.children,
    x: maskNode.x || 0,
    y: maskNode.y || 0,
    width: maskNode.width || 0,
    height: maskNode.height || 0,
    visible: maskNode.visible !== false,
    opacity: maskNode.opacity ?? 1,
    rotation: maskNode.rotation || 0,
  };
}

/**
 * Strip the isMask flag from a node (avoid recursion).
 * @param {object} node - Figma node
 * @returns {object} Node copy without isMask
 */
function stripMaskFlag(node) {
  const copy = { ...node };
  delete copy.isMask;
  return copy;
}

/**
 * Create a PenPot mask group from a Kizuku MASK_GROUP node.
 * @param {object} maskGroupNode - Kizuku mask group
 * @param {string} groupId - PenPot UUID for this group
 * @returns {object} PenPot shape with masked-group flag
 */
function createPenpotMaskGroup(maskGroupNode, groupId) {
  return {
    id: groupId,
    type: 'group',
    name: maskGroupNode.name || 'Mask Group',
    'masked-group': true,
    shapes: [],
  };
}

module.exports = {
  hasMaskChild,
  groupChildrenWithMasks,
  createPenpotMaskGroup,
};
