const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  prettier,
  {
    ignores: ['**/__tests__/**', '**/*.test.js', '**/*.spec.js', 'node_modules/**'],
  },
  {
    files: ['src/**/*.js', '*.js', 'tools/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        jest: 'readonly',
        // Browser/Electron renderer globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Node: 'readonly',
        MutationObserver: 'readonly',
      },
    },
    rules: {
      // Complexity and readability rules - adjusted for this codebase
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 5],
      complexity: ['error', 10],
      'max-statements': ['error', 30],
      'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true }],

      // Code quality rules
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console for Electron apps
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Style and formatting (handled by Prettier)
      indent: 'off',
      quotes: 'off',
      semi: 'off',

      // Function and variable naming
      camelcase: ['error', { properties: 'never' }],
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],

      // Error prevention
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'prefer-arrow-callback': 'error',

      // Documentation requirements
      'require-jsdoc': 'off', // We'll enforce this selectively
      'valid-jsdoc': 'off',
    },
  },
];
