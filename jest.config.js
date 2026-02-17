/**
 * Jest Configuration
 *
 * Configuration for unit and integration tests.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: ['**/tests/**/*.test.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/services/figma/**/*.js',
    '!src/services/**/*.test.js',
    '!**/node_modules/**',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform files
  transform: {},

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/penpot/', '/backup/'],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Run tests serially to avoid file system conflicts
  maxWorkers: 1,
};
