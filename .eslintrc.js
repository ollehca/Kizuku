/**
 * ESLint Configuration
 */

module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'max-lines-per-function': ['error', { max: 50, skipComments: true, skipBlankLines: true }],
    'max-statements': ['error', 30],
    complexity: ['error', 10],
    'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Test files
      files: ['**/*.test.js', '**/tests/**/*.js', 'tests/**/*.js'],
      env: {
        jest: true,
        node: true,
        commonjs: true,
      },
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
      rules: {
        'max-lines-per-function': 'off', // Tests can be longer
        'max-statements': 'off',
        complexity: 'off',
        'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      },
    },
  ],
};
