/**
 * Kizuku PenPot Image Builder
 * Handles image asset lookup, dimension estimation, and fill conversion.
 */

/** Module-level image asset lookup */
let imageAssetMap = new Map();

/**
 * Set image assets for data-uri embedding
 * Stores both full hash and extension-stripped hash for flexible lookup
 * @param {array} images - Array of { hash, data } objects
 */
function setImageAssets(images) {
  imageAssetMap = new Map();
  if (Array.isArray(images)) {
    for (const img of images) {
      if (img.hash && img.data) {
        imageAssetMap.set(img.hash, img);
        const stripped = img.hash.replace(/\.[^.]+$/, '');
        if (stripped !== img.hash) {
          imageAssetMap.set(stripped, img);
        }
      }
    }
  }
}

/**
 * Build fill-image object for PenPot (served via mock server)
 * @param {string} imageRef - Image hash reference
 * @returns {object} PenPot fill-image object
 */
function buildFillImage(imageRef) {
  const imgData = imageAssetMap.get(imageRef);
  const dims = resolveImageDimensions(imgData);
  const mtype = imgData?.mtype || 'image/png';
  return {
    id: imageRef || 'unknown',
    width: dims.width,
    height: dims.height,
    mtype,
    name: imageRef || 'image',
  };
}

/**
 * Resolve image dimensions from metadata or buffer headers
 * @param {object} imgData - Image asset data
 * @returns {object} { width, height }
 */
function resolveImageDimensions(imgData) {
  if (!imgData) {
    return { width: 100, height: 100 };
  }
  const estimated = estimateImageDimensions(imgData);
  return {
    width: estimated.width || imgData.width || 100,
    height: estimated.height || imgData.height || 100,
  };
}

/** Estimate image dimensions from metadata or buffer headers */
function estimateImageDimensions(imgData) {
  if (imgData.width && imgData.height) {
    return { width: imgData.width, height: imgData.height };
  }
  try {
    const buf = Buffer.from(imgData.data, 'base64');
    return parseBufferDimensions(buf);
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Parse dimensions from raw image buffer by format
 * @param {Buffer} buf - Image data buffer
 * @returns {object} { width, height } or empty
 */
function parseBufferDimensions(buf) {
  if (buf.length < 10) {
    return {};
  }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return parseJpegDimensions(buf);
  }
  if (isWebP(buf)) {
    return parseWebPDimensions(buf);
  }
  if (isGif(buf)) {
    return parseGifDimensions(buf);
  }
  return {};
}

/** Parse JPEG dimensions from SOF marker */
function parseJpegDimensions(buf) {
  let off = 2;
  while (off < buf.length - 8) {
    if (buf[off] !== 0xff) {
      break;
    }
    const marker = buf[off + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return {};
}

/**
 * Check if buffer is a WebP image (RIFF...WEBP)
 * @param {Buffer} buf - Image buffer
 * @returns {boolean} True if WebP
 */
function isWebP(buf) {
  return (
    buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45
  );
}

/**
 * Parse WebP dimensions from RIFF header (VP8 chunk)
 * @param {Buffer} buf - WebP buffer
 * @returns {object} { width, height } or empty
 */
function parseWebPDimensions(buf) {
  if (buf.length < 30) {
    return {};
  }
  if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (buf[15] === 0x4c && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return {};
}

/**
 * Check if buffer is a GIF image
 * @param {Buffer} buf - Image buffer
 * @returns {boolean} True if GIF
 */
function isGif(buf) {
  return buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
}

/**
 * Parse GIF dimensions from logical screen descriptor
 * @param {Buffer} buf - GIF buffer
 * @returns {object} { width, height }
 */
function parseGifDimensions(buf) {
  return {
    width: buf.readUInt16LE(6),
    height: buf.readUInt16LE(8),
  };
}

/** Map Figma scale modes to PenPot fill sizing */
const SCALE_MODE_MAP = {
  FILL: 'fill',
  FIT: 'fit',
  TILE: 'tile',
  CROP: 'fill',
};

/**
 * Map Figma scaleMode to PenPot fill-size
 * @param {string} scaleMode - Figma scale mode
 * @returns {string} PenPot fill size
 */
function mapScaleMode(scaleMode) {
  return SCALE_MODE_MAP[scaleMode] || 'fill';
}

/** Convert Kizuku image fill to PenPot fill with data-uri */
function convertImageFill(fill) {
  const result = {
    'fill-image': buildFillImage(fill.imageRef),
    'fill-opacity': fill.opacity ?? 1,
  };
  if (fill.scaleMode) {
    result['fill-image-size'] = mapScaleMode(fill.scaleMode);
  }
  if (fill.imageTransform) {
    attachImageTransform(result, fill.imageTransform);
  }
  attachTilingOutput(result, fill);
  return result;
}

/**
 * Attach tiling properties to PenPot fill output
 * @param {object} result - PenPot fill to extend
 * @param {object} fill - Source Kizuku fill
 */
function attachTilingOutput(result, fill) {
  if (fill.tileScale !== undefined) {
    result['fill-image-tile-scale'] = fill.tileScale;
  }
  if (fill.tileOffsetX !== undefined) {
    result['fill-image-tile-offset-x'] = fill.tileOffsetX;
  }
  if (fill.tileOffsetY !== undefined) {
    result['fill-image-tile-offset-y'] = fill.tileOffsetY;
  }
}

/** Extract crop offset/scale from image transform matrix */
function attachImageTransform(result, matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    return;
  }
  const row0 = matrix[0] || [];
  const row1 = matrix[1] || [];
  result['fill-image-transform'] = {
    scaleX: row0[0] || 1,
    scaleY: row1[1] || 1,
    offsetX: row0[2] || 0,
    offsetY: row1[2] || 0,
  };
}

/**
 * Parse dimensions from a base64-encoded image string
 * @param {string} base64Data - Base64 image data
 * @returns {object} { width, height } or empty object
 */
function parseDimensionsFromBase64(base64Data) {
  try {
    const buf = Buffer.from(base64Data, 'base64');
    return parseBufferDimensions(buf);
  } catch {
    return {};
  }
}

/**
 * Build a single PenPot media entry with parsed dimensions
 * @param {object} img - Image asset { hash, data, mtype, name, width, height }
 * @returns {object} PenPot media entry
 */
function buildMediaEntry(img) {
  const dims =
    img.width && img.height
      ? { width: img.width, height: img.height }
      : parseDimensionsFromBase64(img.data);
  return {
    id: img.hash,
    name: img.name || img.hash,
    mtype: img.mtype || 'image/png',
    width: dims.width || 0,
    height: dims.height || 0,
    data: img.data,
  };
}

/**
 * Build PenPot media map from extracted images with dimensions
 * @param {array} images - Array of { hash, data, mtype, name } objects
 * @returns {object} PenPot media map keyed by hash
 */
function buildMediaMap(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return {};
  }
  const media = {};
  for (const img of images) {
    if (img.hash && img.data) {
      media[img.hash] = buildMediaEntry(img);
    }
  }
  return media;
}

module.exports = {
  setImageAssets,
  buildFillImage,
  convertImageFill,
  mapScaleMode,
  buildMediaMap,
};
