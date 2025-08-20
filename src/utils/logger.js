/**
 * Centralized logging utility for PenPot Desktop
 * Provides clean logging without ESLint warnings
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Log levels for different types of messages
 */
const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

/**
 * Format log message with timestamp and context
 * @param {string} level - Log level
 * @param {string} context - Context (e.g., 'WebView', 'IPC', 'Main')
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 * @returns {string} Formatted message
 */
function formatMessage(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const emoji = getLogEmoji(level);

  let formatted = `${emoji} [${timestamp}] ${context}: ${message}`;

  if (data && typeof data === 'object') {
    formatted += ` | ${JSON.stringify(data)}`;
  } else if (data) {
    formatted += ` | ${data}`;
  }

  return formatted;
}

/**
 * Get emoji for log level
 * @param {string} level - Log level
 * @returns {string} Emoji for the level
 */
function getLogEmoji(level) {
  const emojis = {
    info: '📝',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  };

  return emojis[level] || '📝';
}

/**
 * Create info and warn logger methods
 * @param {string} context - Context name
 * @returns {object} Info and warn logger methods
 */
function createInfoWarnMethods(context) {
  return {
    info: (message, data) => {
      if (isDev) {
        console.log(formatMessage(LOG_LEVELS.INFO, context, message, data));
      }
    },
    warn: (message, data) => {
      if (isDev) {
        console.warn(formatMessage(LOG_LEVELS.WARN, context, message, data));
      }
    },
  };
}

/**
 * Create error and debug logger methods
 * @param {string} context - Context name
 * @returns {object} Error and debug logger methods
 */
function createErrorDebugMethods(context) {
  return {
    error: (message, data) => {
      console.error(formatMessage(LOG_LEVELS.ERROR, context, message, data));
    },
    debug: (message, data) => {
      if (isDev) {
        console.debug(formatMessage(LOG_LEVELS.DEBUG, context, message, data));
      }
    },
  };
}

/**
 * Create logger instance for a specific context
 * @param {string} context - Context name (e.g., 'WebView')
 * @returns {object} Logger instance
 */
function createLogger(context) {
  const infoWarnMethods = createInfoWarnMethods(context);
  const errorDebugMethods = createErrorDebugMethods(context);

  return { ...infoWarnMethods, ...errorDebugMethods };
}

/**
 * Default logger instance
 */
const logger = createLogger('App');

module.exports = {
  createLogger,
  logger,
  LOG_LEVELS,
};
