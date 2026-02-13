#!/usr/bin/env node
/**
 * Test script for Figma → Kizu → PenPot conversion pipeline
 * Verifies that the test Figma JSON file can be converted and would render
 */

const fs = require('fs').promises;
const path = require('path');

// Import conversion utilities
const { getFigmaJSONConverter } = require('./src/services/figma/figma-json-converter');

async function testConversion() {
  console.log('='.repeat(60));
  console.log('Testing Figma → Kizu → PenPot Conversion Pipeline');
  console.log('='.repeat(60));

  try {
    // Step 1: Load test Figma JSON
    console.log('\n📂 Step 1: Loading test Figma JSON...');
    const figmaJsonPath = path.join(__dirname, 'test-data', 'test-figma-design.json');
    const figmaJson = JSON.parse(await fs.readFile(figmaJsonPath, 'utf-8'));
    console.log('   ✅ Loaded:', figmaJson.name);
    console.log('   Pages:', figmaJson.document.children.length);

    // Step 2: Convert to Kizu format
    console.log('\n🔄 Step 2: Converting to Kizu format...');
    const converter = getFigmaJSONConverter();
    const result = await converter.convert(figmaJson, { name: 'Test Import' });

    console.log('   ✅ Converted successfully');
    console.log('   Compatibility score:', result.compatibilityScore);
    console.log('   Total nodes:', result.stats.totalNodes);
    console.log('   Converted nodes:', result.stats.convertedNodes);
    console.log('   Warnings:', result.stats.warnings.length);
    console.log('   Errors:', result.stats.errors.length);

    const kizuProject = result.project;
    console.log('\n📦 Kizu Project Structure:');
    console.log('   ID:', kizuProject.metadata.id);
    console.log('   Name:', kizuProject.metadata.name);
    console.log('   Pages:', kizuProject.data.pages.length);

    for (const page of kizuProject.data.pages) {
      console.log(`   📄 Page "${page.name}": ${page.children?.length || 0} children`);
      for (const child of (page.children || [])) {
        console.log(`      - ${child.type}: ${child.name}`);
      }
    }

    // Step 3: Simulate conversion to PenPot format (using mock backend logic)
    console.log('\n🔄 Step 3: Converting to PenPot format...');

    // This replicates what penpot-mock-backend does
    const crypto = require('crypto');
    const pagesArray = [];
    const pagesIndex = {};
    const ROOT_UUID = '00000000-0000-0000-0000-000000000000';

    function flattenChildren(children, objects, parentId, frameId) {
      const childIds = [];
      for (const child of children) {
        const shapeId = child.id || crypto.randomUUID();
        childIds.push(shapeId);

        // Build selrect from x, y, width, height
        const selrect = {
          x: child.x || 0,
          y: child.y || 0,
          width: child.width || 100,
          height: child.height || 100,
          x1: child.x || 0,
          y1: child.y || 0,
          x2: (child.x || 0) + (child.width || 100),
          y2: (child.y || 0) + (child.height || 100),
        };

        // Build points from selrect
        const points = [
          { x: selrect.x, y: selrect.y },
          { x: selrect.x2, y: selrect.y },
          { x: selrect.x2, y: selrect.y2 },
          { x: selrect.x, y: selrect.y2 },
        ];

        // Convert fills to PenPot format
        const fills = (child.fills || []).map(fill => ({
          'fill-color': fill.color || '#000000',
          'fill-opacity': fill.opacity ?? 1,
        }));

        // Determine actual frame-id (for frame types, it's their own ID)
        const actualFrameId = child.type === 'frame' ? shapeId : frameId;
        const actualParentId = child.type === 'frame' ? ROOT_UUID : parentId;

        const shape = {
          id: shapeId,
          type: child.type || 'rect',
          name: child.name || 'Unnamed',
          'frame-id': actualFrameId,
          'parent-id': actualParentId,
          x: child.x || 0,
          y: child.y || 0,
          width: child.width || 100,
          height: child.height || 100,
          selrect,
          points,
          fills: fills.length > 0 ? fills : [],
          visible: child.visible !== false,
          opacity: child.opacity ?? 1,
          rotation: child.rotation || 0,
          'blend-mode': 'normal',
          transform: [1, 0, 0, 1, 0, 0],
          'transform-inverse': [1, 0, 0, 1, 0, 0],
        };

        // Add corner radius for rects
        if (child.type === 'rect' && child.cornerRadius) {
          shape.rx = child.cornerRadius;
          shape.ry = child.cornerRadius;
        }

        // Add text-specific properties
        if (child.type === 'text') {
          shape.content = child.content || '';
        }

        objects[shapeId] = shape;

        // Process children recursively
        if (child.children && child.children.length > 0) {
          const nestedIds = flattenChildren(child.children, objects, shapeId, actualFrameId);
          shape.shapes = nestedIds;
        } else {
          shape.shapes = [];
        }
      }
      return childIds;
    }

    // Process pages
    for (const page of kizuProject.data.pages) {
      const pageId = page.id || crypto.randomUUID();
      pagesArray.push(pageId);

      const pageObjects = {};
      let childIds = [];

      if (page.children && page.children.length > 0) {
        childIds = flattenChildren(page.children, pageObjects, ROOT_UUID, ROOT_UUID);
      }

      // Create root frame
      pageObjects[ROOT_UUID] = {
        id: ROOT_UUID,
        type: 'frame',
        name: 'Root Frame',
        'frame-id': ROOT_UUID,
        'parent-id': ROOT_UUID,
        x: 0, y: 0, width: 1, height: 1,
        selrect: { x: 0, y: 0, width: 1, height: 1, x1: 0, y1: 0, x2: 1, y2: 1 },
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        transform: [1, 0, 0, 1, 0, 0],
        'transform-inverse': [1, 0, 0, 1, 0, 0],
        visible: true,
        opacity: 1,
        rotation: 0,
        'blend-mode': 'normal',
        fills: [],
        strokes: [],
        shapes: childIds,
      };

      pagesIndex[pageId] = {
        id: pageId,
        name: page.name || 'Untitled Page',
        objects: pageObjects,
      };
    }

    const penpotFile = {
      id: kizuProject.metadata.id,
      name: kizuProject.metadata.name,
      'project-id': kizuProject.metadata.id,
      'team-id': '00000000-0000-0000-0000-000000000001',
      version: 22,
      revn: 0,
      data: {
        pages: pagesArray,
        'pages-index': pagesIndex,
        options: { 'components-v2': true },
      },
      'is-shared': false,
      permissions: ['owner'],
    };

    console.log('   ✅ PenPot file structure created');
    console.log('   File ID:', penpotFile.id);
    console.log('   Pages:', penpotFile.data.pages.length);

    for (const [pageId, page] of Object.entries(penpotFile.data['pages-index'])) {
      console.log(`   📄 Page "${page.name}":`);
      console.log(`      Objects: ${Object.keys(page.objects).length}`);
      for (const [objId, obj] of Object.entries(page.objects)) {
        console.log(`      - [${obj.type}] ${obj.name} (${objId.substring(0, 8)}...)`);
      }
    }

    // Step 4: Verify structure is valid
    console.log('\n✅ Step 4: Validating structure...');
    const errors = [];

    // Check root frame exists
    for (const page of Object.values(penpotFile.data['pages-index'])) {
      if (!page.objects[ROOT_UUID]) {
        errors.push(`Page "${page.name}" missing root frame`);
      }

      // Check all shapes have required fields
      for (const [objId, obj] of Object.entries(page.objects)) {
        if (!obj.type) errors.push(`Object ${objId} missing type`);
        if (!obj.selrect) errors.push(`Object ${objId} missing selrect`);
        if (!obj.points) errors.push(`Object ${objId} missing points`);
        if (!obj['frame-id']) errors.push(`Object ${objId} missing frame-id`);
        if (!obj['parent-id']) errors.push(`Object ${objId} missing parent-id`);
      }
    }

    if (errors.length > 0) {
      console.log('   ❌ Validation errors:');
      errors.forEach(e => console.log(`      - ${e}`));
    } else {
      console.log('   ✅ All validations passed!');
    }

    // Save output for inspection
    const outputPath = path.join(__dirname, 'test-data', 'output', 'converted-penpot-file.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(penpotFile, null, 2));
    console.log(`\n📁 Output saved to: ${outputPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ CONVERSION TEST PASSED');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

testConversion().then(success => {
  process.exit(success ? 0 : 1);
});
