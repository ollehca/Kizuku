/**
 * STAGE 3/4 TEST: Can PenPot render a hardcoded file from mock backend?
 *
 * This test bypasses ALL Figma import logic and tests ONLY:
 * 1. Can the mock backend serve a valid file structure?
 * 2. Can PenPot's frontend actually render it?
 *
 * If this fails: Problem is in mock backend or PenPot integration
 * If this works: Problem is in Figma parsing/conversion
 *
 * @run node test/stage-test-hardcoded-file.js
 */

const http = require('http');
const transit = require('transit-js');

// ============================================================================
// HARDCODED MINIMAL PENPOT FILE
// This is the EXACT structure PenPot expects. No conversion, no parsing.
// ============================================================================

const HARDCODED_FILE_ID = '11111111-1111-1111-1111-111111111111';
const HARDCODED_PAGE_ID = '22222222-2222-2222-2222-222222222222';
const HARDCODED_FRAME_ID = '33333333-3333-3333-3333-333333333333';
const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Creates a minimal valid PenPot file structure
 * @returns {object} PenPot file object
 */
function createHardcodedPenpotFile() {
  return {
    id: HARDCODED_FILE_ID,
    name: 'Hardcoded Test File',
    'project-id': '00000000-0000-0000-0000-000000000002',
    version: 22,
    revn: 0,
    'created-at': new Date().toISOString(),
    'modified-at': new Date().toISOString(),
    features: ['fdata/shape-data-type', 'components/v2'],
    data: {
      pages: [HARDCODED_PAGE_ID],
      'pages-index': {
        [HARDCODED_PAGE_ID]: createHardcodedPage()
      },
      options: {
        'components-v2': true
      }
    },
    'is-shared': false,
    permissions: ['owner']
  };
}

/**
 * Creates a minimal valid PenPot page with one frame containing a rectangle
 * @returns {object} PenPot page object
 */
function createHardcodedPage() {
  return {
    id: HARDCODED_PAGE_ID,
    name: 'Test Page',
    objects: {
      // Root frame (required - uuid/zero)
      [ROOT_FRAME_ID]: {
        id: ROOT_FRAME_ID,
        type: 'frame',
        name: 'Root Frame',
        'frame-id': ROOT_FRAME_ID,
        'parent-id': ROOT_FRAME_ID,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        shapes: [HARDCODED_FRAME_ID]
      },
      // A visible frame
      [HARDCODED_FRAME_ID]: {
        id: HARDCODED_FRAME_ID,
        type: 'frame',
        name: 'My Test Frame',
        'frame-id': ROOT_FRAME_ID,
        'parent-id': ROOT_FRAME_ID,
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        fills: [{ 'fill-color': '#3388ff', 'fill-opacity': 1 }],
        strokes: [],
        shapes: []
      }
    }
  };
}

// ============================================================================
// TEST MOCK SERVER
// Simulates what our mock backend should do
// ============================================================================

let testServer = null;

/**
 * Starts a test server that serves the hardcoded file
 * @param {number} port - Port to listen on
 * @returns {Promise<void>}
 */
function startTestServer(port = 9998) {
  return new Promise((resolve, reject) => {
    testServer = http.createServer((req, res) => {
      console.log(`📨 Request: ${req.method} ${req.url}`);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const command = url.pathname.replace('/api/rpc/command/', '');

      handleCommand(command, res);
    });

    testServer.listen(port, () => {
      console.log(`✅ Test server running on http://localhost:${port}`);
      resolve();
    });

    testServer.on('error', reject);
  });
}

/**
 * Handles mock backend commands
 * @param {string} command - Command name
 * @param {http.ServerResponse} res - Response object
 */
function handleCommand(command, res) {
  let result;

  switch (command) {
    case 'get-file':
      console.log('📂 Serving hardcoded file');
      result = createHardcodedPenpotFile();
      break;
    case 'get-file-object-thumbnails':
      result = [];
      break;
    case 'get-file-libraries':
      result = [];
      break;
    case 'get-comment-threads':
      result = [];
      break;
    case 'get-profiles-for-file-comments':
      result = [];
      break;
    default:
      console.log(`⚠️ Unhandled command: ${command}`);
      result = null;
  }

  const writer = transit.writer('json-verbose');
  const encoded = writer.write(result);

  res.writeHead(200, { 'Content-Type': 'application/transit+json' });
  res.end(encoded);
}

/**
 * Stops the test server
 */
function stopTestServer() {
  if (testServer) {
    testServer.close();
    testServer = null;
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Tests if we can serve a file and decode it correctly
 */
async function testFileServing() {
  console.log('\n🧪 TEST 1: File Serving');
  console.log('=' .repeat(50));

  await startTestServer(9998);

  try {
    const response = await fetch(
      'http://localhost:9998/api/rpc/command/get-file'
    );
    const text = await response.text();

    console.log('📦 Response length:', text.length);
    console.log('📦 First 200 chars:', text.substring(0, 200));

    // Try to decode Transit
    const reader = transit.reader('json');
    const decoded = reader.read(text);

    console.log('✅ Transit decode successful');
    console.log('📦 File ID:', decoded.id);
    console.log('📦 File name:', decoded.name);
    console.log('📦 Pages:', decoded.data?.pages);

    return { success: true, file: decoded };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    stopTestServer();
  }
}

/**
 * Validates the file structure matches what PenPot expects
 */
function testFileStructure() {
  console.log('\n🧪 TEST 2: File Structure Validation');
  console.log('=' .repeat(50));

  const file = createHardcodedPenpotFile();
  const errors = [];

  // Required top-level fields
  const requiredFields = ['id', 'name', 'version', 'data'];
  for (const field of requiredFields) {
    if (!file[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Required data fields
  if (!file.data?.pages || !Array.isArray(file.data.pages)) {
    errors.push('data.pages must be an array');
  }
  if (!file.data?.['pages-index']) {
    errors.push('data.pages-index must exist');
  }

  // Check page structure
  const pageId = file.data?.pages?.[0];
  const page = file.data?.['pages-index']?.[pageId];

  if (!page) {
    errors.push('First page not found in pages-index');
  } else {
    if (!page.objects) {
      errors.push('Page missing objects');
    }
    if (!page.objects?.[ROOT_FRAME_ID]) {
      errors.push('Page missing root frame (uuid/zero)');
    }
  }

  if (errors.length > 0) {
    console.log('❌ Validation errors:');
    errors.forEach(e => console.log('   -', e));
    return { success: false, errors };
  }

  console.log('✅ File structure is valid');
  console.log('📦 Pages:', file.data.pages.length);
  console.log('📦 Objects in page:', Object.keys(page.objects).length);

  return { success: true };
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🔬 STAGE 3/4 TEST: Hardcoded File Rendering');
  console.log('=' .repeat(60));
  console.log('This tests if the mock backend can serve a valid file');
  console.log('and if the structure is correct for PenPot.\n');

  const results = {};

  // Test 1: File structure
  results.structure = testFileStructure();

  // Test 2: File serving
  results.serving = await testFileServing();

  // Summary
  console.log('\n📊 RESULTS');
  console.log('=' .repeat(60));
  console.log('Structure valid:', results.structure.success ? '✅' : '❌');
  console.log('Serving works:', results.serving.success ? '✅' : '❌');

  if (results.structure.success && results.serving.success) {
    console.log('\n✅ BACKEND IS WORKING');
    console.log('The hardcoded file can be served correctly.');
    console.log('\nNEXT STEP: Test if PenPot can actually render this.');
    console.log('1. Start Kizuku with: npm start');
    console.log('2. Navigate to workspace with this file ID:');
    console.log(`   http://localhost:3449/#/workspace?file-id=${HARDCODED_FILE_ID}`);
    console.log('\nIf PenPot shows the file: Problem is in Figma conversion');
    console.log('If PenPot shows error: Problem is in backend integration');
  } else {
    console.log('\n❌ BACKEND HAS ISSUES');
    console.log('Fix these before testing Figma import.');
  }

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

module.exports = {
  createHardcodedPenpotFile,
  createHardcodedPage,
  HARDCODED_FILE_ID,
  HARDCODED_PAGE_ID
};
