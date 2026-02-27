#!/usr/bin/env node
/**
 * Kizuku Test Runner
 * Runs all unit tests in the test/ directory sequentially.
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const testDir = path.join(__dirname, 'test');
const testFiles = fs
  .readdirSync(testDir)
  .filter((f) => f.endsWith('.test.js'))
  .filter((f) => f !== 'auth-integration.test.js')
  .sort();

let totalPassed = 0;
let totalFailed = 0;
const startTime = Date.now();

console.log(`\nRunning ${testFiles.length} test files...\n`);

for (const file of testFiles) {
  const filePath = path.join(testDir, file);
  try {
    const output = execSync(`node "${filePath}"`, {
      encoding: 'utf8',
      timeout: 30000,
    });
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const passed = passMatch ? Number.parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;
    totalPassed += passed;
    totalFailed += failed;
    const icon = failed > 0 ? 'FAIL' : 'PASS';
    console.log(`  ${icon}: ${file} (${passed} passed, ${failed} failed)`);
  } catch (err) {
    totalFailed++;
    console.log(`  FAIL: ${file} — ${err.message.split('\n')[0]}`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n${totalPassed} passed, ${totalFailed} failed in ${elapsed}s`);
process.exit(totalFailed > 0 ? 1 : 0);
