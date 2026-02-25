/**
 * Fig Blob Decoder
 * Decodes binary blob data from .fig files into SVG path commands.
 * Blobs contain path geometry referenced by commandsBlob index.
 */

/** Command byte constants in .fig binary blob format */
const CMD_CLOSE = 0;
const CMD_MOVE = 1;
const CMD_LINE = 2;
const CMD_CUBIC = 4;

/**
 * Convert blob bytes object to a Buffer
 * @param {object} blob - Blob with bytes property { 0: val, 1: val, ... }
 * @returns {Buffer} Node.js Buffer
 */
function blobToBuffer(blob) {
  if (!blob?.bytes) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(blob.bytes)) {
    return blob.bytes;
  }
  const keys = Object.keys(blob.bytes).sort((a, b) => Number(a) - Number(b));
  return Buffer.from(keys.map((key) => blob.bytes[key]));
}

/**
 * Round a float to 4 decimal places for SVG output
 * @param {number} val - Float value
 * @returns {number} Rounded value
 */
function roundCoord(val) {
  return Math.round(val * 10000) / 10000;
}

/**
 * Read a MoveTo command from buffer
 * @param {Buffer} buf - Data buffer
 * @param {number} offset - Current byte offset
 * @returns {object} { svgPart, newOffset }
 */
function readMoveTo(buf, offset) {
  const xVal = roundCoord(buf.readFloatLE(offset));
  const yVal = roundCoord(buf.readFloatLE(offset + 4));
  return { svgPart: `M ${xVal} ${yVal}`, newOffset: offset + 8 };
}

/**
 * Read a LineTo command from buffer
 * @param {Buffer} buf - Data buffer
 * @param {number} offset - Current byte offset
 * @returns {object} { svgPart, newOffset }
 */
function readLineTo(buf, offset) {
  const xVal = roundCoord(buf.readFloatLE(offset));
  const yVal = roundCoord(buf.readFloatLE(offset + 4));
  return { svgPart: `L ${xVal} ${yVal}`, newOffset: offset + 8 };
}

/**
 * Read a CubicTo command from buffer
 * @param {Buffer} buf - Data buffer
 * @param {number} offset - Current byte offset
 * @returns {object} { svgPart, newOffset }
 */
function readCubicTo(buf, offset) {
  const x1 = roundCoord(buf.readFloatLE(offset));
  const y1 = roundCoord(buf.readFloatLE(offset + 4));
  const x2 = roundCoord(buf.readFloatLE(offset + 8));
  const y2 = roundCoord(buf.readFloatLE(offset + 12));
  const xVal = roundCoord(buf.readFloatLE(offset + 16));
  const yVal = roundCoord(buf.readFloatLE(offset + 20));
  return {
    svgPart: `C ${x1} ${y1} ${x2} ${y2} ${xVal} ${yVal}`,
    newOffset: offset + 24,
  };
}

/** Command byte to reader function dispatch */
const CMD_READERS = {
  [CMD_MOVE]: readMoveTo,
  [CMD_LINE]: readLineTo,
  [CMD_CUBIC]: readCubicTo,
};

/**
 * Decode a commandsBlob into an SVG path string
 * @param {Buffer} buf - Binary buffer of path commands
 * @returns {string} SVG path d-attribute string
 */
function decodeCommandsBlob(buf) {
  if (!buf || buf.length === 0) {
    return '';
  }
  const parts = [];
  let offset = 0;

  while (offset < buf.length) {
    const cmdByte = buf[offset];
    offset++;

    if (cmdByte === CMD_CLOSE) {
      parts.push('Z');
      continue;
    }

    const reader = CMD_READERS[cmdByte];
    if (!reader) {
      break;
    }
    if (offset + getCommandSize(cmdByte) > buf.length) {
      break;
    }
    const result = reader(buf, offset);
    parts.push(result.svgPart);
    offset = result.newOffset;
  }

  return parts.join(' ');
}

/**
 * Get expected byte size for a command's parameters
 * @param {number} cmdByte - Command byte value
 * @returns {number} Number of parameter bytes
 */
function getCommandSize(cmdByte) {
  const sizes = { [CMD_MOVE]: 8, [CMD_LINE]: 8, [CMD_CUBIC]: 24 };
  return sizes[cmdByte] || 0;
}

/**
 * Resolve commandsBlob references in fillGeometry array
 * @param {array} fillGeometry - Array of geometry objects with commandsBlob
 * @param {array} blobs - Array of blob objects from .fig data
 * @returns {array} Geometry with path strings instead of blob refs
 */
function resolveFillGeometryBlobs(fillGeometry, blobs) {
  if (!Array.isArray(fillGeometry) || !Array.isArray(blobs)) {
    return fillGeometry;
  }
  return fillGeometry.map((geo) => resolveOneGeometry(geo, blobs));
}

/**
 * Resolve a single geometry object's blob reference
 * @param {object} geo - Geometry object { commandsBlob, windingRule, ... }
 * @param {array} blobs - Blob array
 * @returns {object} Geometry with path string
 */
function resolveOneGeometry(geo, blobs) {
  if (geo.path || geo.commandsBlob === undefined) {
    return geo;
  }
  const blobIndex = geo.commandsBlob;
  if (blobIndex < 0 || blobIndex >= blobs.length) {
    return geo;
  }
  const buf = blobToBuffer(blobs[blobIndex]);
  const path = decodeCommandsBlob(buf);
  return { ...geo, path };
}

module.exports = {
  decodeCommandsBlob,
  resolveFillGeometryBlobs,
  blobToBuffer,
};
