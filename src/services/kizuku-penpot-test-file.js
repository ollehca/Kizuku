/**
 * Kizuku PenPot Test File Builder
 * Creates a minimal valid PenPot file for backend integration testing.
 */

const geometry = require('./kizuku-penpot-geometry');

const KIZUKU_TEAM_ID = '00000000-0000-0000-0000-000000000001';
const TEST_FILE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PAGE_ID = '22222222-2222-2222-2222-222222222222';
const TEST_FRAME_ID = '33333333-3333-3333-3333-333333333333';
const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Build test page objects for hardcoded test file
 * @returns {object} Objects map with root frame and test frame
 */
function buildTestPageObjects() {
  return {
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
      ...geometry.buildGeometry(0, 0, 1, 1, 0),
      shapes: [TEST_FRAME_ID],
    },
    [TEST_FRAME_ID]: {
      id: TEST_FRAME_ID,
      type: 'frame',
      name: 'Test Frame - Backend Works!',
      'frame-id': ROOT_FRAME_ID,
      'parent-id': ROOT_FRAME_ID,
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      ...geometry.buildGeometry(100, 100, 400, 300, 0),
      fills: [{ 'fill-color': '#3388ff', 'fill-opacity': 1 }],
      shapes: [],
    },
  };
}

/**
 * Creates a minimal valid PenPot file for backend integration testing
 * @returns {object} Hardcoded PenPot file structure
 */
function createHardcodedTestFile() {
  const now = new Date().toISOString();
  return {
    id: TEST_FILE_ID,
    name: 'Hardcoded Test File',
    'project-id': TEST_FILE_ID,
    'team-id': KIZUKU_TEAM_ID,
    version: 22,
    revn: 0,
    'created-at': now,
    'modified-at': now,
    features: ['components/v2'],
    data: {
      pages: [TEST_PAGE_ID],
      'pages-index': {
        [TEST_PAGE_ID]: {
          id: TEST_PAGE_ID,
          name: 'Test Page',
          options: {},
          objects: buildTestPageObjects(),
        },
      },
      options: { 'components-v2': true },
    },
    'is-shared': false,
    permissions: ['owner'],
  };
}

module.exports = {
  createHardcodedTestFile,
  TEST_FILE_ID,
};
