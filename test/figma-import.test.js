/**
 * Figma Import Integration Test
 * Tests the complete import flow from .json/.fig files to .kizuku projects
 */

const path = require('node:path');
const fs = require('node:fs').promises;

// Test configuration
const TEST_JSON_PATH = path.join(__dirname, '../test-data/test-figma-design.json');
const OUTPUT_DIR = path.join(__dirname, '../test-data/output');

/**
 * Test 1: FigFileParser - Binary parsing
 */
async function testFigFileParser() {
  console.log('\n📦 TEST 1: FigFileParser');
  console.log('=' .repeat(50));

  const { getFigFileParser } = require('../src/services/figma/fig-file-parser');
  const parser = getFigFileParser();

  console.log('✅ FigFileParser loaded successfully');
  console.log('   Version info:', parser.getVersionInfo());

  // Note: We don't have a real .fig file to test with
  console.log('⚠️  No real .fig file available for binary parsing test');
  console.log('   To test binary parsing, drop a .fig file into test-data/');

  return { success: true, message: 'Parser loaded, no binary file to test' };
}

/**
 * Test 2: FigmaJSONConverter - JSON to .kizuku conversion
 */
async function testFigmaJSONConverter() {
  console.log('\n📦 TEST 2: FigmaJSONConverter');
  console.log('=' .repeat(50));

  const { getFigmaJSONConverter } = require('../src/services/figma/figma-json-converter');
  const converter = getFigmaJSONConverter();

  console.log('✅ FigmaJSONConverter loaded successfully');

  // Load test JSON
  const testJsonContent = await fs.readFile(TEST_JSON_PATH, 'utf-8');
  const figmaData = JSON.parse(testJsonContent);

  console.log('✅ Test JSON loaded:', figmaData.name);
  console.log('   Document children:', figmaData.document?.children?.length || 0);

  // Convert
  console.log('🔄 Converting to .kizuku format...');
  const result = await converter.convert(figmaData, {
    name: 'Test Import',
    license: 'private'
  });

  console.log('✅ Conversion complete!');
  console.log('   Compatibility score:', result.compatibilityScore + '%');
  console.log('   Stats:', {
    totalNodes: result.stats.totalNodes,
    convertedNodes: result.stats.convertedNodes,
    warnings: result.stats.warnings.length,
    errors: result.stats.errors.length
  });

  // Validate output structure
  const project = result.project;
  const validationErrors = [];

  if (!project.version) validationErrors.push('Missing version');
  if (!project.type) validationErrors.push('Missing type');
  if (!project.metadata?.id) validationErrors.push('Missing metadata.id');
  if (!project.metadata?.name) validationErrors.push('Missing metadata.name');
  if (!project.data?.pages) validationErrors.push('Missing data.pages');

  if (validationErrors.length > 0) {
    console.log('❌ Validation errors:', validationErrors);
    return { success: false, errors: validationErrors };
  }

  console.log('✅ Output structure validated');
  console.log('   Project ID:', project.metadata.id);
  console.log('   Pages:', project.data.pages.length);

  // Save output for inspection
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, 'test-converted.kizuku');
  await fs.writeFile(outputPath, JSON.stringify(project, null, 2));
  console.log('💾 Saved converted project to:', outputPath);

  return { success: true, project, stats: result.stats };
}

/**
 * Test 3: FigmaImporter - Full import flow (without Electron)
 */
async function testFigmaImporterStandalone() {
  console.log('\n📦 TEST 3: FigmaImporter (standalone mode)');
  console.log('=' .repeat(50));

  // Mock the backend service manager for standalone testing
  const mockProjectsDir = path.join(__dirname, '../test-data/output');

  // Create a minimal mock
  const originalModule = require.cache[require.resolve('../src/services/backend-service-manager')];

  // Test validation only (don't run full import which needs Electron)
  const { getFigmaImporter } = require('../src/services/figma/figma-importer');
  const importer = getFigmaImporter();

  console.log('✅ FigmaImporter loaded');
  console.log('   Current status:', importer.getStatus());

  // Test file validation
  console.log('🔄 Testing file validation...');
  try {
    const validation = await importer.validateFile(TEST_JSON_PATH);
    console.log('✅ File validation passed:', validation);
  } catch (error) {
    console.log('❌ File validation failed:', error.message);
    return { success: false, error: error.message };
  }

  // Note: Full import requires BackendServiceManager to be initialized
  console.log('⚠️  Full import test requires Electron environment');
  console.log('   Run the app and use drag-and-drop to test full flow');

  return { success: true, message: 'Validation passed, full import requires Electron' };
}

/**
 * Test 4: Verify .kizuku file can be loaded by ProjectManager
 */
async function testProjectManagerLoad() {
  console.log('\n📦 TEST 4: ProjectManager Load');
  console.log('=' .repeat(50));

  const outputPath = path.join(OUTPUT_DIR, 'test-converted.kizuku');

  // Check if converted file exists
  try {
    await fs.access(outputPath);
  } catch {
    console.log('⚠️  No converted file to test, run Test 2 first');
    return { success: false, message: 'No file to test' };
  }

  // Load the file directly (without full ProjectManager which needs ConfigManager)
  const content = await fs.readFile(outputPath, 'utf-8');
  const project = JSON.parse(content);

  // Validate it matches expected structure
  const requiredFields = [
    'version',
    'type',
    'metadata.id',
    'metadata.name',
    'metadata.created',
    'metadata.modified',
    'data.pages',
    'settings.canvas'
  ];

  const missingFields = [];
  for (const field of requiredFields) {
    const parts = field.split('.');
    let value = project;
    for (const part of parts) {
      value = value?.[part];
    }
    if (value === undefined) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    console.log('❌ Missing required fields:', missingFields);
    return { success: false, missingFields };
  }

  console.log('✅ Project structure is valid');
  console.log('   Version:', project.version);
  console.log('   Type:', project.type);
  console.log('   Name:', project.metadata.name);
  console.log('   ID:', project.metadata.id);
  console.log('   Pages:', project.data.pages.length);

  return { success: true, project };
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 FIGMA IMPORT TEST SUITE');
  console.log('=' .repeat(60));
  console.log('Test JSON:', TEST_JSON_PATH);
  console.log('Output Dir:', OUTPUT_DIR);

  const results = {};

  // Run tests
  try {
    results.parser = await testFigFileParser();
  } catch (error) {
    results.parser = { success: false, error: error.message };
    console.error('❌ Test 1 failed:', error);
  }

  try {
    results.converter = await testFigmaJSONConverter();
  } catch (error) {
    results.converter = { success: false, error: error.message };
    console.error('❌ Test 2 failed:', error);
  }

  try {
    results.importer = await testFigmaImporterStandalone();
  } catch (error) {
    results.importer = { success: false, error: error.message };
    console.error('❌ Test 3 failed:', error);
  }

  try {
    results.projectLoad = await testProjectManagerLoad();
  } catch (error) {
    results.projectLoad = { success: false, error: error.message };
    console.error('❌ Test 4 failed:', error);
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  for (const [name, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (result.success) passed++;
    else failed++;
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  return results;
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(results => {
      const allPassed = Object.values(results).every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
