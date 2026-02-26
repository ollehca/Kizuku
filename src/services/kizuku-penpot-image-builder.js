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

/** Estimate image dimensions from PNG/JPEG header bytes */
function estimateImageDimensions(imgData) {
  if (imgData.width && imgData.height) {
    return { width: imgData.width, height: imgData.height };
  }
  try {
    const buf = Buffer.from(imgData.data, 'base64');
    if (buf.length < 24) {
      return {};
    }
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      return parseJpegDimensions(buf);
    }
  } catch {
    /* ignore */
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
 * Convert Kizuku image fill to PenPot fill with data-uri
 * @param {object} fill - Kizuku fill with type 'image'
 * @returns {object} PenPot image fill
 */
function convertImageFill(fill) {
  return {
    'fill-image': buildFillImage(fill.imageRef),
    'fill-opacity': fill.opacity ?? 1,
  };
}

module.exports = {
  setImageAssets,
  buildFillImage,
  convertImageFill,
};
