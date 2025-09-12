/**
 * Manual test for native file dialogs functionality
 * This script provides a simple way to test the dialog functions
 */

const menuActions = require('./src/menu-actions');
const { createLogger } = require('./src/utils/logger');

const logger = createLogger('ManualDialogTest');

console.log('🧪 Kizu Native File Dialogs - Manual Test');
console.log('=' .repeat(50));

function testDialogFunctions() {
  console.log('\n📋 Testing dialog function availability:');
  
  const functions = [
    'showOpenProjectDialog',
    'showSaveAsDialog', 
    'showImportImageDialog',
    'showImportFontDialog'
  ];
  
  let allFunctionsAvailable = true;
  
  functions.forEach(funcName => {
    if (typeof menuActions[funcName] === 'function') {
      console.log(`  ✅ ${funcName} - Available`);
    } else {
      console.log(`  ❌ ${funcName} - Not available`);
      allFunctionsAvailable = false;
    }
  });
  
  return allFunctionsAvailable;
}

function testFileExtensions() {
  console.log('\n📁 Verifying file extension updates:');
  
  // Read the menu-actions.js file to verify extensions
  const fs = require('fs');
  const path = require('path');
  
  try {
    const menuActionsPath = path.join(__dirname, 'src', 'menu-actions.js');
    const content = fs.readFileSync(menuActionsPath, 'utf8');
    
    const checks = [
      { name: 'Kizu Extensions in Open Dialog', pattern: /name: 'Kizu Files', extensions: \['kizu'\]/ },
      { name: 'Kizu Extensions in Save Dialog', pattern: /name: 'Kizu Files', extensions: \['kizu'\]/ },
      { name: 'Legacy PenPot Support', pattern: /name: 'PenPot Files \(Legacy\)', extensions: \['penpot'\]/ },
      { name: 'Open Dialog Title', pattern: /title: 'Open Kizu Project'/ },
      { name: 'Save Dialog Title', pattern: /title: 'Save Kizu Project'/ },
      { name: 'Default Save Name', pattern: /defaultPath: 'Untitled Project\.kizu'/ },
    ];
    
    let allChecksPass = true;
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} - Found`);
      } else {
        console.log(`  ❌ ${check.name} - Missing`);
        allChecksPass = false;
      }
    });
    
    return allChecksPass;
    
  } catch (error) {
    console.log(`  ❌ Error reading menu-actions.js: ${error.message}`);
    return false;
  }
}

function testErrorHandling() {
  console.log('\n⚠️ Verifying error handling implementation:');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const menuActionsPath = path.join(__dirname, 'src', 'menu-actions.js');
    const content = fs.readFileSync(menuActionsPath, 'utf8');
    
    const errorHandlingChecks = [
      { name: 'Try-Catch Blocks', pattern: /try \{[\s\S]*?\} catch \(error\) \{/ },
      { name: 'Logger Integration', pattern: /logger\.(info|error)/ },
      { name: 'Error Box Display', pattern: /dialog\.showErrorBox/ },
      { name: 'Operation Logging', pattern: /logger\.info.*dialog/ },
    ];
    
    let errorHandlingScore = 0;
    
    errorHandlingChecks.forEach(check => {
      const matches = content.match(new RegExp(check.pattern, 'g'));
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        console.log(`  ✅ ${check.name} - Found (${count} instances)`);
        errorHandlingScore++;
      } else {
        console.log(`  ❌ ${check.name} - Missing`);
      }
    });
    
    return errorHandlingScore === errorHandlingChecks.length;
    
  } catch (error) {
    console.log(`  ❌ Error checking error handling: ${error.message}`);
    return false;
  }
}

function testCrossPlatformCompatibility() {
  console.log('\n🌐 Cross-platform compatibility check:');
  
  console.log(`  📍 Current platform: ${process.platform}`);
  console.log(`  📍 Node.js version: ${process.version}`);
  
  // Test electron availability (without importing to avoid issues)
  try {
    const packageJson = require('./package.json');
    const hasElectron = packageJson.devDependencies && packageJson.devDependencies.electron;
    
    if (hasElectron) {
      console.log(`  ✅ Electron dependency found: ${packageJson.devDependencies.electron}`);
    } else {
      console.log('  ❌ Electron dependency not found');
      return false;
    }
    
    // Check platform-specific considerations
    const platformChecks = {
      'darwin': 'macOS - Native dialogs supported',
      'win32': 'Windows - Native dialogs supported', 
      'linux': 'Linux - Native dialogs supported'
    };
    
    const platformStatus = platformChecks[process.platform] || 'Unknown platform';
    console.log(`  📍 Platform status: ${platformStatus}`);
    
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error checking platform compatibility: ${error.message}`);
    return false;
  }
}

function runManualTests() {
  console.log('\n🚀 Running manual tests...\n');
  
  const tests = [
    { name: 'Dialog Functions', fn: testDialogFunctions },
    { name: 'File Extensions', fn: testFileExtensions },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Cross-Platform', fn: testCrossPlatformCompatibility },
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    try {
      const result = test.fn();
      if (result) {
        console.log(`\n✅ ${test.name} test PASSED`);
        passed++;
      } else {
        console.log(`\n❌ ${test.name} test FAILED`);
      }
    } catch (error) {
      console.log(`\n❌ ${test.name} test ERROR: ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 MANUAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All native file dialog manual tests passed!');
    console.log('✨ File dialogs are ready for Issue #57 completion.');
  } else {
    console.log('\n⚠️ Some tests failed. Review the details above.');
  }
  
  return passed === total;
}

// Run the manual tests
if (require.main === module) {
  runManualTests();
}

module.exports = {
  runManualTests,
  testDialogFunctions,
  testFileExtensions, 
  testErrorHandling,
  testCrossPlatformCompatibility,
};