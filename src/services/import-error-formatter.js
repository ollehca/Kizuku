/**
 * Import Error Formatter
 * Maps technical error messages to user-friendly descriptions
 * with actionable "What to try" suggestions.
 */

/**
 * Error pattern definitions with user-facing messages
 * Each entry: { pattern, title, message, suggestions }
 */
const ERROR_PATTERNS = [
  {
    pattern: /Failed to decode \.fig binary/i,
    title: 'Unsupported File Format',
    message: 'This file uses a format that Kizuku cannot read yet.',
    suggestions: [
      'Open the file in Figma and re-save it',
      'Export as .fig from Figma (File > Save local copy)',
      'Try a different version of the file',
    ],
  },
  {
    pattern: /Decompression failed|All methods exhausted/i,
    title: 'Corrupted File',
    message: 'The file appears to be damaged or incomplete.',
    suggestions: [
      'Download the file again from Figma',
      'Check that the file was fully downloaded',
      'Try opening the file in Figma first to verify it works',
    ],
  },
  {
    pattern: /does not contain canvas\.fig/i,
    title: 'Not a Figma File',
    message: 'This file does not contain Figma design data.',
    suggestions: [
      'Make sure this is a .fig file from Figma',
      'Check that the file extension is correct',
      'Export a fresh copy from Figma',
    ],
  },
  {
    pattern: /File too large/i,
    title: 'File Too Large',
    message: 'This file exceeds the import size limit.',
    suggestions: [
      'Try splitting the Figma file into smaller files',
      'Remove unused pages or components in Figma first',
    ],
  },
  {
    pattern: /Invalid file type|Unsupported file type/i,
    title: 'Wrong File Type',
    message: 'Kizuku supports .fig, .kizuku, and .json files.',
    suggestions: [
      'Drag a .fig file exported from Figma',
      'Or use a previously saved .kizuku project file',
    ],
  },
  {
    pattern: /ENOENT|no such file/i,
    title: 'File Not Found',
    message: 'The file could not be read from disk.',
    suggestions: [
      'Make sure the file still exists at that location',
      'Try dragging the file again',
    ],
  },
];

/**
 * Format a technical error into a user-friendly message
 * @param {Error|string} error - Technical error
 * @returns {string} User-friendly error message
 */
function formatImportError(error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const matched = findMatchingPattern(errorMsg);

  if (matched) {
    return buildFormattedMessage(matched);
  }
  return buildGenericMessage(errorMsg);
}

/**
 * Find the first matching error pattern
 * @param {string} errorMsg - Error message text
 * @returns {object|null} Matched pattern or null
 */
function findMatchingPattern(errorMsg) {
  return ERROR_PATTERNS.find((entry) => entry.pattern.test(errorMsg)) || null;
}

/**
 * Build formatted message from a matched pattern
 * @param {object} matched - Matched error pattern
 * @returns {string} Formatted message
 */
function buildFormattedMessage(matched) {
  const tips = matched.suggestions.map((s) => `  - ${s}`).join('\n');
  return `${matched.title}\n\n${matched.message}\n\nWhat to try:\n${tips}`;
}

/**
 * Build generic error message for unmatched errors
 * @param {string} errorMsg - Original error message
 * @returns {string} Formatted generic message
 */
function buildGenericMessage(errorMsg) {
  const short = errorMsg.length > 120 ? errorMsg.slice(0, 120) + '...' : errorMsg;
  return (
    'Import Failed\n\n' +
    `Something went wrong: ${short}\n\n` +
    'What to try:\n' +
    '  - Try the import again\n' +
    '  - Make sure the file is a valid Figma .fig file\n' +
    '  - Check the developer console for details'
  );
}

module.exports = {
  formatImportError,
  ERROR_PATTERNS,
};
