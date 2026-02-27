#!/usr/bin/env node
/* eslint-env node */
/**
 * Kizuku License Code Generator CLI Tool
 *
 * Usage:
 *   node tools/generate-license.js --type private --email user@example.com
 *   node tools/generate-license.js --type private --count 100 --output codes.csv
 *   node tools/generate-license.js --validate KIZUKU-XXXX-XXXX-XXXX-XXXX
 *
 * @module generate-license-cli
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  generateLicense,
  validateLicense,
  generateBatch,
  LICENSE_TYPES,
} = require('../src/services/license-code');

// ANSI color codes for better CLI output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Create default parsed arguments object
 */
function createDefaultArgs() {
  return {
    type: 'private',
    email: '',
    count: 1,
    output: null,
    validate: null,
    help: false,
  };
}

/**
 * Process a single argument
 */
function processArgument(parsed, arg, next, index) {
  const argHandlers = {
    '--type': () => {
      parsed.type = next;
      return index + 1;
    },
    '-t': () => {
      parsed.type = next;
      return index + 1;
    },
    '--email': () => {
      parsed.email = next;
      return index + 1;
    },
    '-e': () => {
      parsed.email = next;
      return index + 1;
    },
    '--count': () => {
      parsed.count = Number.parseInt(next, 10);
      return index + 1;
    },
    '-c': () => {
      parsed.count = Number.parseInt(next, 10);
      return index + 1;
    },
    '--output': () => {
      parsed.output = next;
      return index + 1;
    },
    '-o': () => {
      parsed.output = next;
      return index + 1;
    },
    '--validate': () => {
      parsed.validate = next;
      return index + 1;
    },
    '-v': () => {
      parsed.validate = next;
      return index + 1;
    },
    '--help': () => {
      parsed.help = true;
      return index;
    },
    '-h': () => {
      parsed.help = true;
      return index;
    },
  };

  if (argHandlers[arg]) {
    return argHandlers[arg]();
  }

  if (!arg.startsWith('-')) {
    parsed.validate = arg;
  }

  return index;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = createDefaultArgs();

  let idx = 0;
  while (idx < args.length) {
    idx = processArgument(parsed, args[idx], args[idx + 1], idx) + 1;
  }

  return parsed;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
${colors.bright}Kizuku License Code Generator${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node tools/generate-license.js [OPTIONS]

${colors.cyan}OPTIONS:${colors.reset}
  -t, --type <type>        License type (private, business, trial)
                           Default: private

  -e, --email <email>      User email (optional)

  -c, --count <number>     Generate multiple licenses (1-1000)
                           Default: 1

  -o, --output <file>      Output file (JSON or CSV format)
                           Determined by file extension
                           If not specified, prints to console

  -v, --validate <code>    Validate a license code

  -h, --help               Show this help message

${colors.cyan}EXAMPLES:${colors.reset}
  ${colors.yellow}# Generate single private license${colors.reset}
  node tools/generate-license.js --type private --email user@example.com

  ${colors.yellow}# Generate 100 licenses and save to CSV${colors.reset}
  node tools/generate-license.js --type private --count 100 --output licenses.csv

  ${colors.yellow}# Generate licenses and save to JSON${colors.reset}
  node tools/generate-license.js --type business --count 50 --output licenses.json

  ${colors.yellow}# Validate a license code${colors.reset}
  node tools/generate-license.js --validate KIZUKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX

${colors.cyan}LICENSE TYPES:${colors.reset}
  private     - For individual/solo users (local-only)
  business    - For teams/organizations (cloud-enabled)
  trial       - For trial/demo purposes

${colors.cyan}SECURITY NOTE:${colors.reset}
  This tool requires the KIZUKU_LICENSE_SECRET environment variable.
  Keep this secret secure and never commit it to version control.
  For production use, load the secret from a secure key store.
`);
}

/**
 * Format license data for console output
 */
function formatForConsole(license) {
  console.log(`
${colors.bright}${colors.green}✓ License Generated Successfully${colors.reset}

${colors.cyan}Code:${colors.reset}        ${colors.bright}${license.code}${colors.reset}
${colors.cyan}Type:${colors.reset}        ${license.type}
${colors.cyan}Email:${colors.reset}       ${license.email || '(not specified)'}
${colors.cyan}Generated:${colors.reset}   ${license.generatedAt}

${colors.bright}${colors.red}⚠️  SECURITY WARNING${colors.reset}
${colors.yellow}Keep this code secure. Do not share with anyone.
If lost or stolen, contact support immediately.${colors.reset}
`);
}

/**
 * Save licenses to JSON file
 */
function saveToJSON(licenses, filename) {
  const output = {
    generated: new Date().toISOString(),
    count: licenses.length,
    licenses: licenses.map((l) => ({
      code: l.code,
      type: l.type,
      email: l.email,
      generatedAt: l.generatedAt,
    })),
  };

  fs.writeFileSync(filename, JSON.stringify(output, null, 2), 'utf8');
  console.log(`${colors.green}✓${colors.reset} Saved ${licenses.length} license(s) to ${filename}`);
}

/**
 * Save licenses to CSV file
 */
function saveToCSV(licenses, filename) {
  const header = 'Code,Type,Email,Generated At\n';
  const rows = licenses
    .map((l) => `"${l.code}","${l.type}","${l.email}","${l.generatedAt}"`)
    .join('\n');

  fs.writeFileSync(filename, header + rows, 'utf8');
  console.log(`${colors.green}✓${colors.reset} Saved ${licenses.length} license(s) to ${filename}`);
}

/**
 * Display validation result
 */
function displayValidationResult(code, result) {
  if (result.valid) {
    console.log(`
${colors.bright}${colors.green}✓ License Code Valid${colors.reset}

${colors.cyan}Code:${colors.reset}        ${code}
${colors.cyan}Type:${colors.reset}        ${result.type}
${colors.cyan}Generated:${colors.reset}   ${result.generatedAt}
${colors.cyan}Unique ID:${colors.reset}   ${result.uniqueId}
`);
  } else {
    console.log(`
${colors.bright}${colors.red}✗ License Code Invalid${colors.reset}

${colors.cyan}Code:${colors.reset}   ${code}
${colors.cyan}Error:${colors.reset}  ${result.error}
`);
  }
}

/**
 * Handle validation command
 */
function handleValidation(code) {
  const result = validateLicense(code);
  displayValidationResult(code, result);
  process.exit(result.valid ? 0 : 1);
}

/**
 * Validate arguments
 */
function validateArgs(args) {
  if (!Object.values(LICENSE_TYPES).includes(args.type)) {
    const types = Object.values(LICENSE_TYPES).join(', ');
    console.error(`${colors.red}Error:${colors.reset} Invalid type: ${args.type}`);
    console.error(`Valid types: ${types}`);
    process.exit(1);
  }

  if (args.count < 1 || args.count > 1000) {
    console.error(`${colors.red}Error:${colors.reset} Count: 1-1000`);
    process.exit(1);
  }
}

/**
 * Generate licenses based on count
 */
function generateLicenses(args) {
  if (args.count === 1) {
    return [generateLicense({ type: args.type, email: args.email })];
  }
  return generateBatch({ count: args.count, type: args.type });
}

/**
 * Output to file or console
 */
function outputResults(licenses, outputPath) {
  if (outputPath) {
    outputToFile(licenses, outputPath);
  } else {
    outputToConsole(licenses);
  }
}

/**
 * Output licenses to file
 */
function outputToFile(licenses, outputPath) {
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.json') {
    saveToJSON(licenses, outputPath);
  } else if (ext === '.csv') {
    saveToCSV(licenses, outputPath);
  } else {
    console.error(`${colors.red}Error:${colors.reset} Unsupported format: ${ext}`);
    console.error('Supported formats: .json, .csv');
    process.exit(1);
  }
}

/**
 * Output licenses to console
 */
function outputToConsole(licenses) {
  if (licenses.length === 1) {
    formatForConsole(licenses[0]);
  } else {
    const count = licenses.length;
    console.log(`${colors.green}✓${colors.reset} Generated ${count} licenses\n`);
    licenses.forEach((license, index) => {
      console.log(`${index + 1}. ${license.code} (${license.type})`);
    });
    console.log(`\n${colors.yellow}Tip: Use --output to save${colors.reset}`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.validate) {
    handleValidation(args.validate);
  }

  validateArgs(args);

  try {
    const licenses = generateLicenses(args);
    outputResults(licenses, args.output);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
