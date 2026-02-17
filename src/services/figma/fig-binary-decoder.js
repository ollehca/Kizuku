/**
 * Fig Binary Decoder
 * Handles low-level binary parsing of .fig files:
 * chunk extraction, decompression, and kiwi-schema decoding.
 */

const pako = require('pako');
const zstd = require('@mongodb-js/zstd');
const { decodeBinarySchema, compileSchema } = require('kiwi-schema');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('FigBinaryDecoder');

/**
 * Read uint32 from buffer (little-endian)
 * @param {Buffer} buffer - File buffer
 * @param {number} offset - Byte offset
 * @returns {number} Uint32 value
 */
function readUint32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

/**
 * Check if chunk is zstd-compressed
 * @param {Buffer} chunk - Chunk to check
 * @returns {boolean} True if zstd
 */
function isZstdCompressed(chunk) {
  return (
    chunk.length >= 4 &&
    chunk[0] === 0x28 &&
    chunk[1] === 0xb5 &&
    chunk[2] === 0x2f &&
    chunk[3] === 0xfd
  );
}

/**
 * Extract binary chunks from .fig file buffer
 * @param {Buffer} buffer - File buffer
 * @returns {object} { header, version, compressedSchema, compressedData }
 */
function extractChunks(buffer) {
  logger.info('Extracting binary chunks from .fig file');

  const header = buffer.toString('ascii', 0, 8);
  logger.info('File header:', header);

  if (!header.startsWith('fig-')) {
    throw new Error(`Invalid .fig file: Expected "fig-kiwi" header, got "${header}"`);
  }

  const version = readUint32LE(buffer, 8);
  logger.info('File format version:', version);

  const schemaLength = readUint32LE(buffer, 12);
  const schemaStart = 16;
  const schemaEnd = schemaStart + schemaLength;

  const dataLength = readUint32LE(buffer, schemaEnd);
  const dataStart = schemaEnd + 4;
  const dataEnd = dataStart + dataLength;

  if (schemaEnd > buffer.length || dataEnd > buffer.length) {
    throw new Error(`Invalid .fig file: Chunk offsets exceed file size (${buffer.length} bytes)`);
  }

  return {
    header,
    version,
    compressedSchema: buffer.slice(schemaStart, schemaEnd),
    compressedData: buffer.slice(dataStart, dataEnd),
  };
}

/**
 * Decompress a chunk with zstd
 * @param {Buffer} chunk - Compressed chunk
 * @param {string} chunkName - Name for logging
 * @returns {Promise<Uint8Array>} Decompressed data
 */
async function decompressZstd(chunk, chunkName) {
  logger.info('Detected zstd compression');
  const decompressed = await zstd.decompress(chunk);
  logger.info(`${chunkName} decompressed with zstd:`, {
    compressed: chunk.length,
    decompressed: decompressed.length,
    ratio: (decompressed.length / chunk.length).toFixed(2) + 'x',
  });
  return new Uint8Array(decompressed);
}

/**
 * Decompress using pako (DEFLATE/zlib) methods
 * @param {Buffer} chunk - Compressed chunk
 * @param {string} chunkName - Name for logging
 * @returns {Uint8Array} Decompressed data
 */
function decompressDeflate(chunk, chunkName) {
  const methods = [
    { name: 'inflateRaw', fn: () => pako.inflateRaw(chunk) },
    { name: 'inflate', fn: () => pako.inflate(chunk) },
    { name: 'ungzip', fn: () => pako.ungzip(chunk) },
  ];

  for (const method of methods) {
    try {
      logger.info(`Trying ${method.name}...`);
      const decompressed = method.fn();
      logger.info(`${chunkName} decompressed with ${method.name}:`, {
        compressed: chunk.length,
        decompressed: decompressed.length,
        ratio: (decompressed.length / chunk.length).toFixed(2) + 'x',
      });
      return decompressed;
    } catch (error) {
      logger.info(`${method.name} failed: ${error.message}`);
    }
  }

  throw new Error(`Decompression failed for ${chunkName}: All methods exhausted`);
}

/**
 * Decompress a chunk, auto-detecting compression format
 * @param {Buffer} chunk - Compressed chunk
 * @param {string} chunkName - Name for logging
 * @returns {Promise<Uint8Array>} Decompressed data
 */
async function decompressChunk(chunk, chunkName) {
  logger.info(`Decompressing ${chunkName} chunk...`);

  if (isZstdCompressed(chunk)) {
    return decompressZstd(chunk, chunkName);
  }
  return decompressDeflate(chunk, chunkName);
}

/**
 * Parse binary .fig data using kiwi-schema
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<object>} { header, version, schema, data }
 */
async function parseBinary(buffer) {
  try {
    logger.info('Starting binary .fig file parsing');

    const chunks = extractChunks(buffer);
    const { header, version } = chunks;

    const schemaBytes = await decompressChunk(chunks.compressedSchema, 'schema');
    const dataBytes = await decompressChunk(chunks.compressedData, 'data');

    logger.info('Decoding kiwi schema...');
    const schema = decodeBinarySchema(schemaBytes);

    logger.info('Compiling schema...');
    const compiledSchema = compileSchema(schema);

    logger.info('Decoding design data...');
    const designData = compiledSchema.decodeMessage(dataBytes);
    logger.info('Design data decoded successfully');

    return { header, version, schema, data: designData };
  } catch (error) {
    logger.error('Binary parsing failed', {
      errorMessage: error.message,
      errorStack: error.stack,
    });
    throw new Error(
      `Failed to decode .fig binary format: ${error.message}. ` +
        'The file may be corrupted or use an unsupported Figma version.'
    );
  }
}

module.exports = {
  extractChunks,
  decompressChunk,
  parseBinary,
  isZstdCompressed,
};
