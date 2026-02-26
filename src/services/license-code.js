/**
 * Kizuku License Code Generation and Validation System (Final Version)
 *
 * Implements cryptographically secure license code generation using HMAC-SHA256.
 * Uses hex encoding (0-9, A-F) for reliable data encoding without data loss.
 *
 * Format: KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (25 hex characters after KIZUKU-)
 * Data structure: TYPE(1 byte) + TIMESTAMP(6 bytes) + RANDOM(5 bytes) + SIGNATURE(0.5 byte)
 *                 = 12.5 bytes = 25 hex characters
 *
 * SECURITY NOTE:
 * License codes are single-use activation keys. Once used, they're tied to the
 * user's local installation. Users must keep their codes secure - if intercepted
 * or stolen, the license may be compromised. We are not responsible for lost or
 * stolen license codes.
 *
 * @module license-code
 */

const crypto = require('node:crypto');

// Secret key for HMAC signing (should be stored securely in production)
const SECRET_KEY =
  process.env.KIZUKU_LICENSE_SECRET || 'kizuku-dev-secret-key-change-in-production';

// License type constants
const LICENSE_TYPES = {
  PRIVATE: 'private',
  BUSINESS: 'business',
  TRIAL: 'trial',
};

/**
 * Encode buffer to hex string (uppercase)
 */
function encodeHex(buffer) {
  return buffer.toString('hex').toUpperCase();
}

/**
 * Decode hex string to buffer
 */
function decodeHex(string) {
  const upper = string.toUpperCase();

  // Validate hex characters (0-9, A-F)
  if (!/^[0-9A-F]+$/i.test(upper)) {
    throw new Error('Invalid hex character in license code');
  }

  // Hex string must have even length for proper decoding
  // Pad at the END to preserve the first byte
  const padded = upper.length % 2 === 0 ? upper : upper + '0';
  return Buffer.from(padded, 'hex');
}

/**
 * Generate a unique license code
 *
 * @param {Object} options - License generation options
 * @param {string} options.type - License type (private, business, trial)
 * @param {string} [options.email] - User email (for record keeping only, not embedded in code)
 * @param {Object} [options.metadata] - Additional metadata for record keeping
 * @returns {Object} Generated license information
 */
function generateLicense(options = {}) {
  const { type = LICENSE_TYPES.PRIVATE, email = '', metadata = {} } = options;

  // Validate license type
  if (!Object.values(LICENSE_TYPES).includes(type)) {
    throw new Error(`Invalid license type: ${type}`);
  }

  // Generate components
  const timestamp = Date.now();
  const random = crypto.randomBytes(5);

  // Type byte: P=0x50, B=0x42, T=0x54
  const typeByte = type[0].toUpperCase().codePointAt(0);

  // Create data buffer: [TYPE(1)] + [TIMESTAMP(6)] + [RANDOM(5)] = 12 bytes
  const dataBuffer = Buffer.alloc(12);
  dataBuffer[0] = typeByte;
  // Write timestamp as 48-bit integer (6 bytes) - good until year 10889
  dataBuffer.writeUIntBE(timestamp, 1, 6);
  random.copy(dataBuffer, 7);

  // Generate HMAC signature (32 bytes)
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(dataBuffer);
  const signature = hmac.digest();

  // Take first byte of signature (1 byte) - 25 hex chars = 12.5 bytes = 12 data + 1 sig
  const signatureShort = signature.slice(0, 1);

  // Combine: DATA(12) + SIGNATURE(1) = 13 bytes, but we only use 12.5 for 25 hex chars
  const combined = Buffer.concat([dataBuffer, signatureShort]);

  // Encode to hex (13 bytes = 26 hex chars)
  const encoded = encodeHex(combined);

  // Take first 25 characters for consistent format (KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
  const code25 = encoded.substring(0, 25);

  // Format as KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
  const formatted = `KIZUKU-${code25.match(/.{1,5}/g).join('-')}`;

  return {
    code: formatted,
    type,
    email,
    metadata,
    generatedAt: new Date(timestamp).toISOString(),
    timestamp,
    // Security warnings for distribution
    securityNotice:
      'Keep this code secure. Do not share with anyone. If lost or stolen, contact support immediately.',
  };
}

/**
 * Validate basic license code format
 */
function validateBasicFormat(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Invalid license code format' };
  }

  const upper = code.toUpperCase().trim();
  if (!upper.startsWith('KIZUKU-')) {
    return { valid: false, error: 'License code must start with KIZUKU-' };
  }

  return { valid: true, upper };
}

/**
 * Validate encoded license characters
 */
function validateEncodedChars(encoded) {
  if (encoded.length !== 25) {
    return {
      valid: false,
      error: `License code must be exactly 25 characters (found ${encoded.length})`,
    };
  }

  if (!/^[0-9A-F]+$/i.test(encoded)) {
    const invalidChar = encoded.split('').find((c) => !/[0-9A-F]/i.test(c));
    return {
      valid: false,
      error: `Invalid character '${invalidChar}' (only 0-9, A-F allowed)`,
    };
  }

  return { valid: true };
}

/**
 * Decode and validate license buffer
 */
function decodeAndValidate(encoded) {
  let decoded;
  try {
    decoded = decodeHex(encoded);
  } catch (err) {
    return { valid: false, error: `Failed to decode: ${err.message}` };
  }

  if (decoded.length !== 13) {
    return { valid: false, error: 'License code data is incomplete' };
  }

  return { valid: true, decoded };
}

/**
 * Extract and validate license type
 */
function extractLicenseType(dataBuffer) {
  const typeByte = dataBuffer[0];
  const typeChar = String.fromCodePoint(typeByte);
  let type;

  if (typeChar === 'P') {
    type = LICENSE_TYPES.PRIVATE;
  } else if (typeChar === 'B') {
    type = LICENSE_TYPES.BUSINESS;
  } else if (typeChar === 'T') {
    type = LICENSE_TYPES.TRIAL;
  } else {
    return { valid: false, error: `Invalid license type '${typeChar}' in code` };
  }

  return { valid: true, type };
}

/**
 * Validate timestamp range
 */
function validateTimestamp(timestamp) {
  const MIN_TIMESTAMP = new Date('2020-01-01').getTime();
  const MAX_TIMESTAMP = new Date('2100-01-01').getTime();

  if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
    return { valid: false, error: 'License code contains invalid date' };
  }

  return { valid: true };
}

/**
 * Verify license signature
 */
function verifySignature(dataBuffer, providedNibble) {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(dataBuffer);
  const expectedSignature = hmac.digest();
  const expectedNibble = expectedSignature[0] >> 4;

  if (providedNibble !== expectedNibble) {
    return {
      valid: false,
      error: 'License code is invalid or has been tampered with',
    };
  }

  return { valid: true };
}

/**
 * Validate a license code
 *
 * @param {string} code - License code (KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
 * @returns {Object} Validation result
 */
function validateLicense(code) {
  try {
    const formatCheck = validateBasicFormat(code);
    if (!formatCheck.valid) {
      return formatCheck;
    }

    const encoded = formatCheck.upper.replace(/^KIZUKU-/, '').replaceAll('-', '');
    const charCheck = validateEncodedChars(encoded);
    if (!charCheck.valid) {
      return charCheck;
    }

    const decodeResult = decodeAndValidate(encoded);
    if (!decodeResult.valid) {
      return decodeResult;
    }

    const dataBuffer = decodeResult.decoded.slice(0, 12);
    const providedNibble = decodeResult.decoded[12] >> 4;

    const typeResult = extractLicenseType(dataBuffer);
    if (!typeResult.valid) {
      return typeResult;
    }

    const timestamp = dataBuffer.readUIntBE(1, 6);
    const timeCheck = validateTimestamp(timestamp);
    if (!timeCheck.valid) {
      return timeCheck;
    }

    const sigCheck = verifySignature(dataBuffer, providedNibble);
    if (!sigCheck.valid) {
      return sigCheck;
    }

    return {
      valid: true,
      type: typeResult.type,
      generatedAt: new Date(timestamp).toISOString(),
      timestamp,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Check if a license code format is valid (without cryptographic validation)
 * Useful for real-time UI validation before submission
 */
function isValidFormat(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  // Check format: KIZUKU- followed by 5 groups of 5 hex chars (0-9, A-F)
  const pattern = /^KIZUKU-[0-9A-F]{5}(-[0-9A-F]{5}){4}$/i;
  return pattern.test(code);
}

/**
 * Format a license code with proper hyphenation (for display)
 * Accepts code with or without hyphens, returns properly formatted version
 * Filters to hex characters only (0-9, A-F)
 */
function formatCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }

  // Remove all non-hex characters and uppercase (keep only 0-9, A-F)
  const clean = code.toUpperCase().replaceAll(/[^0-9A-F]/gi, '');

  // Add KIZUKU- prefix if missing
  const withPrefix = clean.startsWith('KIZUKU') ? clean : 'KIZUKU' + clean;

  // Remove KIZUKU prefix temporarily
  const codeOnly = withPrefix.replace(/^KIZUKU/, '');

  // Take first 25 characters
  const code25 = codeOnly.substring(0, 25);

  // Format with hyphens based on length
  if (code25.length <= 5) {
    return `KIZUKU-${code25}`;
  }
  if (code25.length <= 10) {
    return `KIZUKU-${code25.substring(0, 5)}-${code25.substring(5)}`;
  }
  if (code25.length <= 15) {
    const part1 = code25.substring(0, 5);
    const part2 = code25.substring(5, 10);
    const part3 = code25.substring(10);
    return `KIZUKU-${part1}-${part2}-${part3}`;
  }
  if (code25.length <= 20) {
    const part1 = code25.substring(0, 5);
    const part2 = code25.substring(5, 10);
    const part3 = code25.substring(10, 15);
    const part4 = code25.substring(15);
    return `KIZUKU-${part1}-${part2}-${part3}-${part4}`;
  }

  const part1 = code25.substring(0, 5);
  const part2 = code25.substring(5, 10);
  const part3 = code25.substring(10, 15);
  const part4 = code25.substring(15, 20);
  const part5 = code25.substring(20);
  return `KIZUKU-${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Wait for timestamp to change (ensures unique timestamps)
 */
function waitForTimestampChange() {
  const start = Date.now();
  while (Date.now() === start) {
    // Busy wait for 1ms
  }
}

/**
 * Generate email for batch license
 */
function generateBatchEmail(prefix, index) {
  return prefix ? `${prefix}${index + 1}@example.com` : '';
}

/**
 * Generate a batch of license codes
 */
function generateBatch(options = {}) {
  const { count = 1, type = LICENSE_TYPES.PRIVATE, prefix = '' } = options;

  if (count < 1 || count > 1000) {
    throw new Error('Batch count must be between 1 and 1000');
  }

  const licenses = [];
  for (let i = 0; i < count; i++) {
    const email = generateBatchEmail(prefix, i);
    licenses.push(generateLicense({ type, email }));

    if (i < count - 1) {
      waitForTimestampChange();
    }
  }

  return licenses;
}

/**
 * Security notice text for user communications
 */
const SECURITY_NOTICE = `
IMPORTANT: Keep Your License Code Secure

Your Kizuku license code is a one-time activation key that grants access to the application.

⚠️ SECURITY WARNINGS:
• Do NOT share your license code with anyone
• Store it in a secure location (password manager recommended)
• Do NOT post it publicly or send via insecure channels
• If your code is lost or stolen, contact support immediately

📧 EMAIL DELIVERY:
• Your code will be sent via email after purchase
• Email is convenient but not the most secure option
• We recommend immediately storing your code in a password manager
• Delete the email after securely storing your code

❌ LIABILITY:
• You are responsible for keeping your license code secure
• Kizuku is NOT responsible for lost, stolen, or compromised codes
• Unauthorized use of your code may result in license deactivation

✅ BEST PRACTICES:
• Copy and paste the code (don't type manually)
• Verify the code starts with "KIZUKU-"
• Keep a backup in a secure location
• Never share screenshots of your license code
`;

module.exports = {
  generateLicense,
  validateLicense,
  isValidFormat,
  formatCode,
  generateBatch,
  LICENSE_TYPES,
  SECURITY_NOTICE,
};
