/**
 * Mock Backend HTTP Server
 * Serves Transit-encoded responses on port 9999 for PenPot API calls.
 * Handles Transit format conversion (keyword keys, UUID values, tagged records).
 */

const http = require('http');
const transit = require('transit-js');

/** UUID regex pattern */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keys whose children use UUID keys instead of keyword keys */
const UUID_KEY_MAPS = new Set(['pages-index', 'objects']);

/** Keys that should be encoded as PenPot record types */
const RECORD_TYPE_KEYS = {
  selrect: 'rect',
  transform: 'matrix',
  'transform-inverse': 'matrix',
};

/** Keys whose array items should be tagged */
const ARRAY_ITEM_TAGS = { points: 'point' };

/** Keys whose VALUES should be keywords (not strings) */
const KEYWORD_VALUE_KEYS = new Set([
  'type',
  'blend-mode',
  'stroke-style',
  'stroke-alignment',
  'stroke-cap',
  'fill-color-ref-type',
  'text-align',
  'text-direction',
  'vertical-align',
  'grow-type',
  'layout',
  'layout-type',
  'layout-wrap-type',
  'layout-flex-dir',
  'layout-justify-content',
  'layout-align-items',
  'layout-align-content',
  'constraints-h',
  'constraints-v',
]);

/**
 * Convert Transit map to plain JS object
 * @param {*} transitMap - Transit map or value
 * @returns {*} Plain JS equivalent
 */
function transitMapToObject(transitMap) {
  if (!transitMap || typeof transitMap !== 'object') {
    return transitMap;
  }
  if (transitMap._entries && Array.isArray(transitMap._entries)) {
    return convertTransitEntries(transitMap._entries);
  }
  if (Array.isArray(transitMap)) {
    return transitMap.map(transitMapToObject);
  }
  return transitMap;
}

/**
 * Convert Transit map entries to plain object
 * @param {array} entries - Transit _entries array
 * @returns {object} Plain JS object
 */
function convertTransitEntries(entries) {
  const result = {};
  for (let i = 0; i < entries.length; i += 2) {
    let key = entries[i];
    const value = entries[i + 1];
    if (key && typeof key === 'object' && key._name) {
      key = key._name;
    }
    result[key] = transitMapToObject(value);
  }
  return result;
}

/**
 * Parse Transit-encoded body (PenPot uses Transit, not JSON)
 * @param {string} bodyText - Request body text
 * @returns {object} Parsed params
 */
function parseTransitBody(bodyText) {
  if (!bodyText || bodyText.trim() === '') {
    return {};
  }
  try {
    const reader = transit.reader('json');
    return transitMapToObject(reader.read(bodyText));
  } catch {
    try {
      return JSON.parse(bodyText);
    } catch {
      return {};
    }
  }
}

/**
 * Check if object looks like a rect
 * @param {object} obj - Object to check
 * @returns {boolean} True if rect-like
 */
function isRectLike(obj) {
  return (
    obj && typeof obj === 'object' && 'x' in obj && 'y' in obj && 'width' in obj && 'height' in obj
  );
}

/**
 * Check if object looks like a matrix
 * @param {object} obj - Object to check
 * @returns {boolean} True if matrix-like
 */
function isMatrixLike(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    'a' in obj &&
    'b' in obj &&
    'c' in obj &&
    'd' in obj &&
    'e' in obj &&
    'f' in obj
  );
}

/**
 * Create a Transit tagged value for PenPot record types
 * @param {string} tag - Record tag (rect, matrix, point)
 * @param {object} obj - Object to tag
 * @returns {object} Transit tagged value
 */
function createTaggedValue(tag, obj) {
  const transitMap = transit.map();
  for (const [key, value] of Object.entries(obj)) {
    transitMap.set(transit.keyword(key), convertToTransitFormat(value));
  }
  return transit.tagged(tag, transitMap);
}

/**
 * Convert a string value to Transit format
 * @param {string} str - String value
 * @param {string|null} parentKey - Parent key for context
 * @returns {*} Transit string, UUID, or keyword
 */
function convertStringValue(str, parentKey) {
  if (UUID_REGEX.test(str)) {
    return transit.uuid(str);
  }
  if (parentKey && KEYWORD_VALUE_KEYS.has(parentKey)) {
    return transit.keyword(str);
  }
  return str;
}

/**
 * Convert an array to Transit format
 * @param {array} arr - Array value
 * @param {string|null} parentKey - Parent key for context
 * @returns {array} Converted array
 */
function convertArrayValue(arr, parentKey) {
  const itemTag = ARRAY_ITEM_TAGS[parentKey];
  if (itemTag) {
    return arr.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return createTaggedValue(itemTag, item);
      }
      return convertToTransitFormat(item, parentKey);
    });
  }
  return arr.map((item) => convertToTransitFormat(item, parentKey));
}

/**
 * Convert a plain object to Transit map format
 * @param {object} obj - Plain object
 * @param {string|null} parentKey - Parent key for context
 * @returns {object} Transit map
 */
function convertObjectValue(obj, parentKey) {
  const recordType = RECORD_TYPE_KEYS[parentKey];
  if (recordType === 'rect' && isRectLike(obj)) {
    return createTaggedValue('rect', obj);
  }
  if (recordType === 'matrix' && isMatrixLike(obj)) {
    return createTaggedValue('matrix', obj);
  }

  const transitMap = transit.map();
  const useUUIDKeys = UUID_KEY_MAPS.has(parentKey);

  for (const [key, value] of Object.entries(obj)) {
    const transitKey =
      useUUIDKeys && UUID_REGEX.test(key) ? transit.uuid(key) : transit.keyword(key);
    transitMap.set(transitKey, convertToTransitFormat(value, key));
  }
  return transitMap;
}

/**
 * Convert JS objects to Transit format
 * @param {*} obj - Value to convert
 * @param {string|null} parentKey - Parent key for context
 * @returns {*} Transit-encoded value
 */
function convertToTransitFormat(obj, parentKey) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'string') {
    return convertStringValue(obj, parentKey);
  }
  if (Array.isArray(obj)) {
    return convertArrayValue(obj, parentKey);
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    return convertObjectValue(obj, parentKey);
  }
  return obj;
}

/**
 * Handle a single HTTP request to the mock server
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 * @param {object} mockBackend - Mock backend module
 */
async function handleRequest(req, res, mockBackend) {
  console.log('🌐 [MockServer] Request:', req.method, req.url);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const commandName = url.pathname.replace('/api/rpc/command/', '').split('?')[0];
    let params = Object.fromEntries(url.searchParams.entries());

    if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const bodyParams = parseTransitBody(Buffer.concat(buffers).toString());
      if (bodyParams && typeof bodyParams === 'object') {
        params = { ...params, ...bodyParams };
      }
    }

    const result = await mockBackend.handleCommand(commandName, params);
    console.log('✅ [MockServer] Handled:', commandName);

    const transitReady = convertToTransitFormat(result);
    const writer = transit.writer('json-verbose');
    const transitEncoded = writer.write(transitReady);

    res.writeHead(200, {
      'Content-Type': 'application/transit+json; charset=utf-8',
    });
    res.end(transitEncoded);
  } catch (error) {
    console.error('❌ [MockServer] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Start the mock backend HTTP server
 * @param {object} mockBackend - Mock backend module
 */
function startMockServer(mockBackend) {
  const server = http.createServer((req, res) => handleRequest(req, res, mockBackend));

  server.on('error', (err) => {
    console.error('❌ [MockServer] Failed to start:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error('   Port 9999 in use. Trying 9998...');
      server.listen(9998, '127.0.0.1', () => {
        console.log('✅ [MockServer] Running on http://127.0.0.1:9998 (fallback)');
      });
    }
  });

  server.listen(9999, '127.0.0.1', () => {
    console.log('✅ [MockServer] Running on http://127.0.0.1:9999');
  });

  console.log('✅ [MockBackend] HTTP server starting...');
}

module.exports = {
  startMockServer,
  convertToTransitFormat,
  parseTransitBody,
};
